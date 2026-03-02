import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.memory import CallSession
from app.schemas.call_log import CallSessionCreate


async def create_call_log(
    db: AsyncSession, org_id: uuid.UUID, data: CallSessionCreate
) -> CallSession:
    session = CallSession(organization_id=org_id, **data.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_call_logs(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[CallSession]:
    result = await db.execute(
        select(CallSession)
        .where(CallSession.organization_id == org_id)
        .order_by(CallSession.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
