"""
Call logs API — returns call sessions with inline cost for the list endpoint,
and a dedicated /cost sub-resource for hospital admins.

Endpoints:
  GET  /call-logs                      → list with duration + total_cost inline
  POST /call-logs                      → create (legacy)
  GET  /call-logs/{session_id}/cost    → CallCostClientOut  (hospital admin)
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, outerjoin

from app.core.deps import DB, CurrentAdmin
from app.schemas.call_log import CallLogCreate, CallSessionOut
from app.schemas.call_cost import CallCostClientOut
from app.crud.call_log import create_call_log
from app.crud.call_cost import get_cost_by_session, list_costs_by_org
from app.models.memory import CallSession
from app.models.call_cost import CallCost

router = APIRouter(prefix="/call-logs", tags=["call-logs"])


@router.post("", response_model=CallSessionOut, status_code=201)
async def create(data: CallLogCreate, admin: CurrentAdmin, db: DB):
    return await create_call_log(db, admin.organization_id, data)


@router.get("", response_model=List[CallSessionOut])
async def list_all(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    """
    List call sessions with duration + total cost inlined from call_cost table.
    Hospital admins see only total_cost_usd — no per-service breakdown.
    """
    result = await db.execute(
        select(CallSession, CallCost)
        .outerjoin(CallCost, CallCost.session_id == CallSession.session_id)
        .where(CallSession.organization_id == admin.organization_id)
        .order_by(CallSession.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()

    sessions = []
    for session, cost in rows:
        s = CallSessionOut.model_validate(session)
        if cost:
            s.duration_seconds = cost.duration_seconds
            s.total_cost_usd = float(cost.total_cost_usd)
        sessions.append(s)
    return sessions


@router.get("/{session_id}/cost", response_model=CallCostClientOut)
async def get_cost(session_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    """
    Return cost summary for a single session.
    Hospital admin sees total cost + duration only.
    """
    cost = await get_cost_by_session(db, session_id)
    if not cost:
        raise HTTPException(status_code=404, detail="Cost record not found for this session")
    # Ensure the session belongs to this admin's org
    if cost.organization_id != admin.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return cost
