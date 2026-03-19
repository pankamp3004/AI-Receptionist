import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    plan_tier: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    max_agents: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_api_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    is_suspended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
