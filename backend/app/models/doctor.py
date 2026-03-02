import uuid
from datetime import datetime, time
import enum
from sqlalchemy import (
    String, Boolean, DateTime, Time, Integer,
    ForeignKey, func, Enum, Text, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped, relationship
from typing import Optional, List
from app.core.database import Base


class DoctorStatusEnum(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"
    Retired = "Retired"


class ShiftStatusEnum(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"
    OnLeave = "OnLeave"


class WeekdayEnum(str, enum.Enum):
    Monday = "Monday"
    Tuesday = "Tuesday"
    Wednesday = "Wednesday"
    Thursday = "Thursday"
    Friday = "Friday"
    Saturday = "Saturday"
    Sunday = "Sunday"


class Doctor(Base):
    __tablename__ = "doctor"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    experiences: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    degree_doc: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[DoctorStatusEnum] = mapped_column(
        Enum(DoctorStatusEnum, name="doctor_status_enum", create_type=False),
        default=DoctorStatusEnum.Active,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    specialties: Mapped[List["Specialty"]] = relationship(
        "Specialty", secondary="doctor_specialty", lazy="selectin"
    )


class DocShift(Base):
    __tablename__ = "doc_shift"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[WeekdayEnum] = mapped_column(
        Enum(WeekdayEnum, name="weekday_enum", create_type=False),
        nullable=False,
    )
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[ShiftStatusEnum] = mapped_column(
        Enum(ShiftStatusEnum, name="shift_status_enum", create_type=False),
        default=ShiftStatusEnum.Active,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("start_time < end_time", name="chk_shift_times"),
    )
