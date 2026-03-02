from fastapi import APIRouter
from app.core.deps import DB, CurrentAdmin
from app.schemas.ai_config import AIConfigOut, AIConfigUpdate
from app.crud.ai_config import get_or_create_ai_config, update_ai_config

router = APIRouter(prefix="/ai-config", tags=["ai-config"])


@router.get("", response_model=AIConfigOut)
async def get(admin: CurrentAdmin, db: DB):
    return await get_or_create_ai_config(db, admin.organization_id)


@router.put("", response_model=AIConfigOut)
async def upsert(data: AIConfigUpdate, admin: CurrentAdmin, db: DB):
    config = await get_or_create_ai_config(db, admin.organization_id)
    return await update_ai_config(db, config, data)
