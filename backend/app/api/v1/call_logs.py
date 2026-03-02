from typing import List
from fastapi import APIRouter
from app.core.deps import DB, CurrentAdmin
from app.schemas.call_log import CallLogCreate, CallLogOut
from app.crud.call_log import create_call_log, list_call_logs

router = APIRouter(prefix="/call-logs", tags=["call-logs"])


@router.post("", response_model=CallLogOut, status_code=201)
async def create(data: CallLogCreate, admin: CurrentAdmin, db: DB):
    return await create_call_log(db, admin.organization_id, data)


@router.get("", response_model=List[CallLogOut])
async def list_all(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    return await list_call_logs(db, admin.organization_id, skip, limit)
