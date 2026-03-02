import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class AIConfiguration(Base):
    __tablename__ = "ai_configurations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    specialty_mappings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    symptom_mappings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
