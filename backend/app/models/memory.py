import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, DateTime, Text, Integer, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class PatientMemory(Base):
    """AI-generated summary per appointment."""
    __tablename__ = "patient_memory"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    app_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class UserMemory(Base):
    """Voice agent persistent memory per caller, scoped to org."""
    __tablename__ = "user_memory"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phone_number: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    last_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_call: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    call_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSONB, nullable=True, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CallSession(Base):
    """AI voice call session record, scoped to org."""
    __tablename__ = "call_session"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phone_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    intent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(
        # Numeric(3,2)
        nullable=True
    )
