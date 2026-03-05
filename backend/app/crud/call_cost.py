"""
CRUD helpers for call_cost table.
"""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.call_cost import CallCost


async def save_call_cost(
    db: AsyncSession,
    session_id: uuid.UUID,
    organization_id: uuid.UUID,
    duration_seconds: int,
    tts_characters: int,
    llm_input_tokens: int,
    llm_output_tokens: int,
    stt_cost_usd: float,
    tts_cost_usd: float,
    llm_cost_usd: float,
    livekit_cost_usd: float,
    total_cost_usd: float,
) -> CallCost:
    record = CallCost(
        session_id=session_id,
        organization_id=organization_id,
        duration_seconds=duration_seconds,
        tts_characters=tts_characters,
        llm_input_tokens=llm_input_tokens,
        llm_output_tokens=llm_output_tokens,
        stt_cost_usd=stt_cost_usd,
        tts_cost_usd=tts_cost_usd,
        llm_cost_usd=llm_cost_usd,
        livekit_cost_usd=livekit_cost_usd,
        total_cost_usd=total_cost_usd,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_cost_by_session(
    db: AsyncSession, session_id: uuid.UUID
) -> Optional[CallCost]:
    result = await db.execute(
        select(CallCost).where(CallCost.session_id == session_id)
    )
    return result.scalar_one_or_none()


async def list_costs_by_org(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[CallCost]:
    result = await db.execute(
        select(CallCost)
        .where(CallCost.organization_id == org_id)
        .order_by(CallCost.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
