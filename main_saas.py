"""
LiveKit Voice Agent - Multi-Tenant SaaS Entry Point
 
Detects organization from inbound phone number or metadata,
loads tenant-specific AI config, and runs tenant-aware booking logic.
 
FIXES APPLIED:
- Moved get_tenant_subscription() into pre-fetch asyncio.gather() to eliminate blocking DB call
- Moved all plugin imports to top of file to avoid blocking filesystem I/O in hot path
- Tuned VAD thresholds to reduce self-interruption (TTS audio triggering VAD)
- Added min_interruption_duration and min_endpointing_delay to prevent accidental interrupts
- Decrement ACTIVE_TENANT_SESSIONS safely in finally block using try/except
"""
 
import asyncio
import collections
import json
import logging
import os
from typing import Optional
 
from dotenv import load_dotenv
from openai import AsyncOpenAI
 
load_dotenv(override=True)
 
from config import validate_environment, ConfigurationError
 
try:
    config = validate_environment()
except ConfigurationError as e:
    import sys
    print(f"Configuration validation failed: {e}")
    raise SystemExit(1)
 
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobProcess,
    RoomInputOptions,
    WorkerOptions,
    cli,
)
 
try:
    from livekit.agents import RoomOptions
except ImportError:
    RoomOptions = RoomInputOptions
 
# FIX: All plugin imports at the top of the file to avoid blocking I/O in hot path
from livekit.plugins import cartesia, deepgram, openai, silero
 
try:
    from livekit.plugins import groq as groq_plugin
except ImportError:
    groq_plugin = None
 
try:
    from livekit.plugins import anthropic as anthropic_plugin
except ImportError:
    anthropic_plugin = None
 
from agents.registry import get_agent_class, list_agent_types
from agents.multitenant_hospital import MultiTenantHospitalAgent
from memory.multitenant_service import get_multitenant_service
from tools.common import COMMON_TOOLS
from tools.session_logger import UniversalLogger
from tools.cost_tracker import CallCostTracker
from memory.service import get_memory_service
 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("receptionist-multitenant")
 
# In-memory counter for active tenant sessions (per-process)
ACTIVE_TENANT_SESSIONS = collections.Counter()
 
 
def prewarm(proc: JobProcess):
    # FIX: Tuned VAD thresholds to reduce self-interruption from TTS audio bleed
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.2,    # was 0.1 — slightly more conservative to avoid TTS false triggers
        min_silence_duration=0.5,   # was 0.2 — wait longer before switching to listening
        activation_threshold=0.55,  # was 0.4 — higher = less sensitive to ambient/TTS audio
    )
    logger.info(f"Prewarming complete. Available agents: {list_agent_types()}")
 
 
async def _generate_summary(session: AgentSession) -> Optional[str]:
    try:
        if not session.current_agent or not session.current_agent.chat_ctx:
            return None
        messages = session.current_agent.chat_ctx.items
        if len(messages) < 2:
            return None
        transcript_parts = []
        for msg in messages:
            if not hasattr(msg, "role") or not hasattr(msg, "content"):
                continue
            if msg.role in ("user", "assistant") and msg.content:
                role = "Caller" if msg.role == "user" else "Agent"
                content = msg.content if isinstance(msg.content, str) else str(msg.content)
                transcript_parts.append(f"{role}: {content}")
        if not transcript_parts:
            return None
        transcript = "\n".join(transcript_parts[-10:])
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Summarize this phone call in 15 words or less. "
                        "Focus on what the caller needed and outcome.\n\n"
                        f"Transcript:\n{transcript}\n\nSummary:"
                    ),
                }
            ],
            max_tokens=50,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return None
 
 
async def _save_call_log_async(
    session: AgentSession,
    organization_id: Optional[str],
    caller_phone: str,
    mt_service,
    cost_tracker: Optional[CallCostTracker] = None,
):
    try:
        logger.info(f"Starting _save_call_log_async for org {organization_id}")
        if not mt_service._pool:
            logger.error("mt_service._pool is None! Cannot save call log.")
            return
 
        logger.info("Generating summary...")
        summary = await _generate_summary(session)
        logger.info(f"Summary generated: {summary}")
 
        # Build full transcript
        transcript = ""
        if session.current_agent and session.current_agent.chat_ctx:
            parts = []
            for msg in session.current_agent.chat_ctx.items:
                if not hasattr(msg, "role"):
                    continue
                content = (
                    msg.content
                    if isinstance(msg.content, str)
                    else str(getattr(msg, "content", ""))
                )
                if msg.role in ("user", "assistant"):
                    role = "Caller" if msg.role == "user" else "Agent"
                    parts.append(f"{role}: {content}")
            transcript = "\n".join(parts)
            logger.info(f"Transcript built, length: {len(transcript)}")
        else:
            logger.warning("No transcript could be built.")
 
        session_id = ""
        if organization_id:
            logger.info("Attempting to insert into call_session...")
            session_id = await mt_service.save_call_log(
                organization_id=organization_id,
                patient_phone=caller_phone,
                transcript=transcript,
                summary=summary or "",
            )
            logger.info(
                f"Call log successfully saved for org {organization_id}, session_id={session_id}"
            )
        else:
            logger.warning("No organization_id, skipping call log save.")
            return
 
        # Save cost breakdown if tracker was provided and session was saved
        if cost_tracker and session_id:
            try:
                cost = cost_tracker.finalize(transcript=transcript)
                await mt_service.save_call_cost(
                    session_id=session_id,
                    organization_id=organization_id,
                    **cost.as_dict(),
                )
            except Exception as cost_err:
                logger.error(f"Failed to save call cost: {cost_err}", exc_info=True)
 
    except Exception as e:
        logger.error(f"Error saving call log: {e}", exc_info=True)
 
 
async def entrypoint(ctx: JobContext):
    """Multi-tenant entrypoint for the voice agent."""
 
    def extract_caller_info(identity: str) -> tuple[str, str]:
        """Extract phone and sanitized identity."""
        if "_user_" in identity:
            return identity.split("_user_")[0], identity
        return identity, identity
 
    # 1. Determine organization from metadata or default
    organization_id: Optional[str] = None
    agent_type = os.getenv("AGENT_TYPE", "hospital")
 
    if ctx.job and ctx.job.metadata:
        try:
            metadata = json.loads(ctx.job.metadata)
            organization_id = metadata.get("organization_id")
            agent_type = metadata.get("agent_type", agent_type)
        except (json.JSONDecodeError, TypeError):
            pass
 
    logger.info(f"Starting agent type: {agent_type}, org: {organization_id}")
 
    session_logger = UniversalLogger(job_id=ctx.job.id, agent_type=agent_type)
    session_logger.log("SYSTEM", "Multi-tenant session starting")
 
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Connected to room: {ctx.room.name}")
 
    # 2. Initialize multi-tenant service
    mt_service = get_multitenant_service()
    await mt_service.initialize()
 
    # 3. If organization_id not set, try to resolve from room/phone metadata
    if not organization_id:
        room_name = ctx.room.name
        if room_name:
            if room_name.startswith("org_"):
                parts = room_name.split("_")
                if len(parts) >= 2:
                    organization_id = parts[1]
                    logger.info(f"Resolved org from room name UUID: {organization_id}")
            else:
                resolved = await mt_service.resolve_organization_by_phone(room_name)
                if resolved:
                    organization_id = resolved
                    logger.info(f"Resolved org from phone mapping: {organization_id}")
 
    # PRE-FETCH: Load AI config, org details AND subscription before waiting for the caller.
    # FIX: subscription check is now part of this gather() so there is zero extra DB latency
    # in the hot path. All three queries run concurrently and complete before the participant
    # even connects, completely masking DB round-trip latency.
    ai_config = {}
    org_details = {}
    subscription = {"is_suspended": False, "max_agents": 1}  # safe defaults
 
    if organization_id:
        logger.info(
            f"Pre-fetching tenant data (config + details + subscription) for {organization_id} "
            "while waiting for participant connection"
        )
        try:
            ai_config, org_details_res, subscription_res = await asyncio.gather(
                mt_service.get_ai_config(organization_id),
                mt_service.get_organization_details(organization_id),
                mt_service.get_tenant_subscription(organization_id),  # FIX: included here
            )
            org_details = org_details_res or {}
            if subscription_res:
                subscription = subscription_res
        except Exception as e:
            logger.error(f"Failed pre-fetching tenant data: {e}")
 
    # 4. Wait for participant
    logger.info("Waiting for caller to connect...")
    participant = await ctx.wait_for_participant()
    caller_identity = participant.identity
    caller_phone, _ = extract_caller_info(caller_identity)
    logger.info(f"Participant connected: {caller_identity}")
 
    # 5. Extract additional info (like phone number) and try resolving org from participant metadata
    if participant.metadata:
        try:
            meta = json.loads(participant.metadata)
 
            # Extract phone_number from metadata if the caller identity doesn't have it
            meta_phone = meta.get("phone_number")
            if meta_phone and "_user_" not in caller_identity:
                caller_phone = meta_phone
 
            if not organization_id:
                organization_id = meta.get("organization_id")
                if organization_id:
                    logger.info(f"Extracted org_id from participant metadata: {organization_id}")
                    # Missed the prefetch window — fetch now (all three, concurrently)
                    ai_config, org_details_res, subscription_res = await asyncio.gather(
                        mt_service.get_ai_config(organization_id),
                        mt_service.get_organization_details(organization_id),
                        mt_service.get_tenant_subscription(organization_id),
                    )
                    org_details = org_details_res or {}
                    if subscription_res:
                        subscription = subscription_res
        except Exception as e:
            logger.error(f"Failed to parse participant metadata: {e}")
 
    # 5b. Fallback: use first registered org (for web/Streamlit demo connections)
    if not organization_id:
        logger.warning("No organization_id found in metadata. Attempting default fallback.")
        organization_id = await mt_service.get_default_organization()
        if organization_id:
            logger.info(f"Using default organization: {organization_id}")
            ai_config, org_details_res, subscription_res = await asyncio.gather(
                mt_service.get_ai_config(organization_id),
                mt_service.get_organization_details(organization_id),
                mt_service.get_tenant_subscription(organization_id),
            )
            org_details = org_details_res or {}
            if subscription_res:
                subscription = subscription_res
        else:
            logger.error("No default organization found in the database either!")
 
    with open("org_debug_dump.txt", "w") as f:
        f.write(f"Organization ID Resolved: {organization_id}\n")
        f.write(f"Participant Metadata: {participant.metadata}\n")
 
    logger.info(f"Final resolved organization_id for AI agent: {organization_id}")
 
    # 6. Suspend Check and Concurrency Bounds
    # FIX: subscription data was already fetched above — no extra DB call here
    if organization_id:
        if subscription.get("is_suspended"):
            logger.warning(f"Tenant {organization_id} is SUSPENDED. Instantly disconnecting room.")
            await ctx.room.disconnect()
            return
 
        max_agents = subscription.get("max_agents", 1)
        current_active = ACTIVE_TENANT_SESSIONS[organization_id]
        if current_active >= max_agents:
            logger.warning(
                f"Tenant {organization_id} exceeded max agents capacity "
                f"({current_active}/{max_agents}). Rejecting."
            )
            await ctx.room.disconnect()
            return
 
        ACTIVE_TENANT_SESSIONS[organization_id] += 1
        logger.info(
            f"Tenant {organization_id} concurrency: "
            f"{ACTIVE_TENANT_SESSIONS[organization_id]}/{max_agents}"
        )
 
    # 7. Legacy memory service for returning caller history
    memory_service = get_memory_service()
    await memory_service.initialize()
    memory = await memory_service.fetch_user_by_email(caller_phone)
 
    # 8. Create cost tracker (one per call)
    cost_tracker = CallCostTracker()
    # Note: tracker.start() is called inside agent.on_enter() when the session begins
 
    # 9. Create multi-tenant agent
    agent = MultiTenantHospitalAgent(
        organization_id=organization_id,
        org_details=org_details,
        ai_config=ai_config,
        memory_context=memory,
        caller_identity=caller_identity,
        db_service=mt_service,
        cost_tracker=cost_tracker,
    )
 
    # 10. Configure dynamic LLM based on Tenant Settings
    # FIX: plugins were already imported at top of file — no blocking import here
    llm_provider = (ai_config.get("llm_provider") or "openai").lower()
    llm_model = ai_config.get("llm_model") or "gpt-4o"
 
 

    logger.info(f"Initializing LLM plugin: {llm_provider} using model: {llm_model}")
    llm_plugin = openai.LLM(model=llm_model)  # safe default
 
    try:
        if llm_provider == "groq":
            if groq_plugin is not None:
                llm_plugin = groq_plugin.LLM(model=llm_model)
            else:
                logger.warning("Groq plugin not installed. Falling back to OpenAI.")
        elif llm_provider == "anthropic":
            if anthropic_plugin is not None:
                llm_plugin = anthropic_plugin.LLM(model=llm_model)
            else:
                logger.warning("Anthropic plugin not installed. Falling back to OpenAI.")
        else:
            llm_plugin = openai.LLM(model=llm_model)
    except Exception as e:
        logger.error(
            f"Failed to load {llm_provider} plugin. Falling back to default OpenAI. Error: {e}"
        )
        llm_plugin = openai.LLM(model="gpt-4o")
 
    # 11. Create session
    # FIX: Added min_interruption_duration and min_endpointing_delay to prevent the agent
    # from switching to listening mode mid-speech due to accidental VAD triggers.
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=llm_plugin,
        tts=cartesia.TTS(model="sonic-3"),
        allow_interruptions=True,
        min_interruption_duration=0.5,  # FIX: require 500ms of real speech to interrupt agent
        min_endpointing_delay=0.8,      # FIX: wait 800ms of silence before treating as end-of-turn
    )
 
    try:
        session_logger.attach(session, room=ctx.room)
        session.universal_logger = session_logger
 
        @session.on("agent_state_changed")
        def on_state_changed(event):
            logger.debug(f"Agent state: {event.new_state}")
 
        @session.on("metrics_collected")
        def on_metrics_collected(event):
            """Capture real LLM token counts from OpenAI's API response."""
            try:
                for metric in event.metrics:
                    if hasattr(metric, "prompt_tokens") and hasattr(metric, "completion_tokens"):
                        cost_tracker.record_llm_tokens(
                            input_tokens=int(metric.prompt_tokens or 0),
                            output_tokens=int(metric.completion_tokens or 0),
                        )
            except Exception as e:
                logger.warning(f"Failed to record LLM metrics: {e}")
 
        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(
                participant_identity=caller_identity,
            ),
        )
        logger.info("Multi-tenant voice agent started")

        # FIX: Use events instead of polling — room stays CONN_CONNECTED even after
        # the participant hangs up, so the old while loop never exited, the finally
        # block never ran, and ACTIVE_TENANT_SESSIONS was never decremented.
        call_ended = asyncio.Event()

        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(participant):
            if participant.identity == caller_identity:
                logger.info(f"Caller {caller_identity} disconnected — ending session.")
                call_ended.set()

        @ctx.room.on("disconnected")
        def on_room_disconnected(*args):
            logger.info("Room disconnected — ending session.")
            call_ended.set()

        await call_ended.wait()
 
    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)
 
    finally:
        # FIX: Safely decrement concurrency counter — wrapped in try/except so a counter
        # error never prevents the rest of cleanup from running
        if organization_id:
            try:
                ACTIVE_TENANT_SESSIONS[organization_id] = max(
                    0, ACTIVE_TENANT_SESSIONS[organization_id] - 1
                )
                logger.info(
                    f"Agent session ended. Tenant {organization_id} concurrency: "
                    f"{ACTIVE_TENANT_SESSIONS[organization_id]}"
                )
            except Exception as counter_err:
                logger.error(f"Error decrementing session counter: {counter_err}")
 
        session_logger.log("SYSTEM", "Session cleanup")
        session_logger.close()
 
        logger.info("Attempting to save call log before shutdown...")
        try:
            await asyncio.shield(
                _save_call_log_async(
                    session,
                    organization_id,
                    caller_phone,
                    mt_service,
                    cost_tracker=cost_tracker,
                )
            )
        except Exception as log_err:
            logger.error(f"Failed to save log during cleanup: {log_err}")
 
        logger.info("Shutting down session")
        session.shutdown(drain=False)
 
        try:
            if ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
                await ctx.room.disconnect()
        except Exception as e:
            logger.error(f"Disconnect error: {e}")
 
        # Close per-session DB pool
        try:
            await mt_service.close()
        except Exception as e:
            logger.error(f"Error closing DB pool: {e}")
 
 
if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )








