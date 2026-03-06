"""
CallCostTracker — lightweight, auditable call cost estimation.

Tracks duration, TTS characters, and transcript word count, then
converts them into per-service USD costs at call end.

Rates are read from environment variables so they can be updated
without a code change:

    RATE_STT_PER_MIN       (default: 0.0043)   Deepgram Nova-2
    RATE_TTS_PER_1K_CHARS  (default: 0.015)    Cartesia Sonic
    RATE_LLM_INPUT_PER_1K  (default: 0.00015)  GPT-4o-mini input
    RATE_LLM_OUTPUT_PER_1K (default: 0.00060)  GPT-4o-mini output
    RATE_LIVEKIT_PER_MIN   (default: 0.003)    LiveKit room
"""

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("cost_tracker")


def _rate(env_key: str, default: float) -> float:
    try:
        return float(os.getenv(env_key, default))
    except ValueError:
        return default


@dataclass
class CallCostResult:
    """Final cost breakdown for one call."""
    duration_seconds: int
    tts_characters: int
    llm_input_tokens: int
    llm_output_tokens: int

    stt_cost_usd: float
    tts_cost_usd: float
    llm_cost_usd: float
    livekit_cost_usd: float
    total_cost_usd: float

    def as_dict(self) -> dict:
        return {
            "duration_seconds": self.duration_seconds,
            "tts_characters": self.tts_characters,
            "llm_input_tokens": self.llm_input_tokens,
            "llm_output_tokens": self.llm_output_tokens,
            "stt_cost_usd": round(self.stt_cost_usd, 6),
            "tts_cost_usd": round(self.tts_cost_usd, 6),
            "llm_cost_usd": round(self.llm_cost_usd, 6),
            "livekit_cost_usd": round(self.livekit_cost_usd, 6),
            "total_cost_usd": round(self.total_cost_usd, 6),
        }


class CallCostTracker:
    """
    Tracks metrics during a live call and computes costs at the end.

    Usage:
        tracker = CallCostTracker()
        tracker.start()

        # Before every session.say():
        tracker.record_tts("Hello, how can I help you?")

        # At call end, pass final transcript:
        result = tracker.finalize(transcript="Agent: Hello ...\nCaller: ...")
        print(result.total_cost_usd)
    """

    def __init__(self):
        self._start_time: Optional[float] = None
        self._tts_characters: int = 0
        self._real_llm_input: int = 0
        self._real_llm_output: int = 0
        self._has_real_llm_metrics: bool = False

    def start(self) -> None:
        """Call once when the session connects."""
        self._start_time = time.monotonic()
        logger.debug("CallCostTracker started")

    def record_tts(self, text: str) -> None:
        """
        Call before every text-to-speech utterance.
        Accumulates the character count for Cartesia billing.
        """
        if text:
            self._tts_characters += len(text)

    def record_llm_tokens(self, input_tokens: int, output_tokens: int) -> None:
        """
        Record REAL token counts from OpenAI's metrics_collected event.
        Call this from the agent's metrics_collected listener.
        These take priority over the word-based estimation in finalize().
        """
        self._real_llm_input += input_tokens
        self._real_llm_output += output_tokens
        self._has_real_llm_metrics = True
        logger.debug(f"Real LLM tokens recorded: input={self._real_llm_input}, output={self._real_llm_output}")

    def finalize(self, transcript: str = "") -> CallCostResult:
        """
        Compute all costs and return a CallCostResult.
        Rates are re-read from .env on every call so changes take effect
        without restarting the application — just update .env and restart the agent.

        Args:
            transcript: Full call transcript string (used to estimate LLM tokens).
        """
        # Re-read .env so any rate changes are picked up immediately
        from dotenv import load_dotenv
        load_dotenv(override=True)

        # --- Duration ----------------------------------------------------------
        if self._start_time:
            duration_seconds = int(time.monotonic() - self._start_time)
        else:
            duration_seconds = 0
        duration_minutes = max(duration_seconds / 60.0, 0)

        # --- LLM token counts (real or estimated) ----------------------------
        if self._has_real_llm_metrics:
            # Use REAL token counts from OpenAI's metrics_collected event
            llm_input_tokens = self._real_llm_input
            llm_output_tokens = self._real_llm_output
            logger.debug("Using real LLM token counts for cost calculation")
        else:
            # Fallback: estimate from transcript (~1.3 tokens per word)
            llm_input_tokens = 0
            llm_output_tokens = 0
            if transcript:
                for line in transcript.splitlines():
                    stripped = line.strip()
                    if not stripped:
                        continue
                    words = len(stripped.split())
                    tokens = int(words * 1.3)
                    if stripped.startswith("Caller:"):
                        llm_input_tokens += tokens
                    else:
                        llm_output_tokens += tokens
            logger.warning("Real LLM metrics not available, using word-count estimation")

        # --- Cost calculation --------------------------------------------------
        rate_stt = _rate("RATE_STT_PER_MIN", 0.0043)
        rate_tts = _rate("RATE_TTS_PER_1K_CHARS", 0.015)
        rate_llm_in = _rate("RATE_LLM_INPUT_PER_1K", 0.00015)
        rate_llm_out = _rate("RATE_LLM_OUTPUT_PER_1K", 0.00060)
        rate_livekit = _rate("RATE_LIVEKIT_PER_MIN", 0.003)

        stt_cost = duration_minutes * rate_stt
        tts_cost = (self._tts_characters / 1000.0) * rate_tts
        llm_cost = (
            (llm_input_tokens / 1000.0) * rate_llm_in
            + (llm_output_tokens / 1000.0) * rate_llm_out
        )
        livekit_cost = duration_minutes * rate_livekit
        total_cost = stt_cost + tts_cost + llm_cost + livekit_cost

        result = CallCostResult(
            duration_seconds=duration_seconds,
            tts_characters=self._tts_characters,
            llm_input_tokens=llm_input_tokens,
            llm_output_tokens=llm_output_tokens,
            stt_cost_usd=stt_cost,
            tts_cost_usd=tts_cost,
            llm_cost_usd=llm_cost,
            livekit_cost_usd=livekit_cost,
            total_cost_usd=total_cost,
        )

        logger.info(
            f"Call cost: duration={duration_seconds}s, tts_chars={self._tts_characters}, "
            f"total=${total_cost:.6f}"
        )
        return result
