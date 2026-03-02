import uuid
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, func, Enum, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class AppointmentStatusEnum(str, enum.Enum):
    Booked = "Booked"
    Scheduled = "Scheduled"
    Completed = "Completed"
    Cancelled = "Cancelled"
    NoShow = "NoShow"
    Rescheduled = "Rescheduled"


class Appointment(Base):
    __tablename__ = "appointment"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_account.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    app_status: Mapped[AppointmentStatusEnum] = mapped_column(
        Enum(AppointmentStatusEnum, name="appointment_status_enum", create_type=False),
        default=AppointmentStatusEnum.Booked,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
