import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.ai_config import AIConfiguration
from app.schemas.ai_config import AIConfigCreate, AIConfigUpdate


async def get_or_create_ai_config(db: AsyncSession, org_id: uuid.UUID) -> AIConfiguration:
    result = await db.execute(
        select(AIConfiguration).where(AIConfiguration.organization_id == org_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = AIConfiguration(organization_id=org_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def update_ai_config(db: AsyncSession, config: AIConfiguration, data: AIConfigUpdate) -> AIConfiguration:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(config, field, value)
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config
