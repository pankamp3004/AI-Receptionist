"""
SQLAlchemy model for call_cost table.
Stores per-service cost breakdown and total cost per call session.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class CallCost(Base):
    """
    Per-call cost breakdown.

    - Individual service costs (stt/tts/llm/livekit) are visible to main admin only.
    - total_cost_usd is visible to hospital/clinic admins.
    """
    __tablename__ = "call_cost"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("call_session.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,  # one cost record per session
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Measurement metrics (audit trail)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tts_characters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    llm_input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    llm_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Per-service costs — main admin eyes only
    stt_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)
    tts_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)
    llm_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)
    livekit_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)

    # Client-visible total
    total_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
