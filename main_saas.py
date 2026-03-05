"""
LiveKit Voice Agent - Multi-Tenant SaaS Entry Point

Detects organization from inbound phone number or metadata,
loads tenant-specific AI config, and runs tenant-aware booking logic.
"""

import asyncio
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

from livekit.plugins import cartesia, deepgram, openai, silero

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


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.1,
        min_silence_duration=0.2,
        activation_threshold=0.4,
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
                    "content": f"Summarize this phone call in 15 words or less. Focus on what the caller needed and outcome.\n\nTranscript:\n{transcript}\n\nSummary:",
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
                content = msg.content if isinstance(msg.content, str) else str(getattr(msg, "content", ""))
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
            logger.info(f"Call log successfully saved for org {organization_id}, session_id={session_id}")
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

    # PRE-FETCH: Load AI config and details before waiting for the caller, completely masking DB latency
    ai_config = {}
    org_details = {}
    
    if organization_id:
        logger.info(f"Pre-fetching tenant data for {organization_id} while waiting for participant connection")
        try:
            ai_config_task = mt_service.get_ai_config(organization_id)
            org_details_task = mt_service.get_organization_details(organization_id)
            ai_config, org_details_res = await asyncio.gather(ai_config_task, org_details_task)
            org_details = org_details_res or {}
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
            if meta_phone and not ("_user_" in caller_identity):
                caller_phone = meta_phone
                
            if not organization_id:
                organization_id = meta.get("organization_id")
                if organization_id:
                    logger.info(f"Extracted org_id from participant metadata: {organization_id}")
                    # We must fetch the DB now because we missed the prefetch window
                    ai_config_task = mt_service.get_ai_config(organization_id)
                    org_details_task = mt_service.get_organization_details(organization_id)
                    ai_config, org_details_res = await asyncio.gather(ai_config_task, org_details_task)
                    org_details = org_details_res or {}
        except Exception as e:
            logger.error(f"Failed to parse participant metadata: {e}")

    # 5b. Fallback: use first registered org (for web/Streamlit demo connections)
    if not organization_id:
        logger.warning("No organization_id found in metadata. Attempting default fallback.")
        organization_id = await mt_service.get_default_organization()
        if organization_id:
            logger.info(f"Using default organization: {organization_id}")
            ai_config_task = mt_service.get_ai_config(organization_id)
            org_details_task = mt_service.get_organization_details(organization_id)
            ai_config, org_details_res = await asyncio.gather(ai_config_task, org_details_task)
            org_details = org_details_res or {}
        else:
            logger.error("No default organization found in the database either!")

    with open("org_debug_dump.txt", "w") as f:
        f.write(f"Organization ID Resolved: {organization_id}\n")
        f.write(f"Participant Metadata: {participant.metadata}\n")
        
    logger.info(f"Final resolved organization_id for AI agent: {organization_id}")

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

    # 9. Create session
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=cartesia.TTS(model="sonic-3"),
        allow_interruptions=True,
    )

    try:
        session_logger.attach(session, room=ctx.room)
        session.universal_logger = session_logger

        @session.on("agent_state_changed")
        def on_state_changed(event):
            logger.debug(f"Agent state: {event.new_state}")

        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomOptions(
                participant_identity=caller_identity,
                close_on_disconnect=False,
            ),
        )
        logger.info("Multi-tenant voice agent started")

        while ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
            await asyncio.sleep(0.1)

    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)

    finally:
        session_logger.log("SYSTEM", "Session cleanup")
        session_logger.close()

        logger.info("Attempting to save call log before shutdown...")
        try:
            await asyncio.shield(
                _save_call_log_async(
                    session, organization_id, caller_phone, mt_service,
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
