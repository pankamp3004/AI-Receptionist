import uuid
from sqlalchemy import String, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from typing import Optional
from app.core.database import Base


class Specialty(Base):
    __tablename__ = "specialty"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    spec_name: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "spec_name", name="uq_specialty_org_name"),
    )


class Symptoms(Base):
    __tablename__ = "symptoms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sym_name: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "sym_name", name="uq_symptom_org_name"),
    )


class DoctorSpecialty(Base):
    """M:N join table — doctor ↔ specialty (org-scoped)."""
    __tablename__ = "doctor_specialty"

    doc_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor.id", ondelete="CASCADE"),
        primary_key=True,
    )
    spec_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("specialty.id", ondelete="CASCADE"),
        primary_key=True,
    )


class SpecSym(Base):
    """AI inference mapping: specialty → symptom with confidence score."""
    __tablename__ = "spec_sym"

    spec_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("specialty.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sym_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("symptoms.id", ondelete="CASCADE"),
        primary_key=True,
    )
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), default=1.0)
