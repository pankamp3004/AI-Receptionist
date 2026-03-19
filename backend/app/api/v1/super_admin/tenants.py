import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.deps import DB, CurrentSuperAdmin
from app.core.security import create_access_token
from app.models.organization import Organization, Admin
from app.models.subscription import TenantSubscription
from app.models.ai_config import AIConfiguration
from app.schemas.organization import OrganizationOut, TokenResponse
from app.schemas.subscription import SubscriptionUpdate, SubscriptionOut, ModelConfigUpdate
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/tenants", tags=["super-admin-tenants"])

class TenantListOut(BaseModel):
    organization: OrganizationOut
    subscription: Optional[SubscriptionOut]
    llm_provider: Optional[str]
    llm_model: Optional[str]

    model_config = {"from_attributes": True}

@router.get("", response_model=List[TenantListOut])
async def list_tenants(super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(Organization))
    orgs = result.scalars().all()
    
    tenant_details = []
    for org in orgs:
        # Fetch subscription
        sub_res = await db.execute(select(TenantSubscription).where(TenantSubscription.organization_id == org.id))
        sub = sub_res.scalar_one_or_none()
        
        # Fetch AI config model info
        ai_res = await db.execute(select(AIConfiguration).where(AIConfiguration.organization_id == org.id))
        ai_cfg = ai_res.scalar_one_or_none()

        tenant_details.append(TenantListOut(
            organization=OrganizationOut.model_validate(org),
            subscription=SubscriptionOut.model_validate(sub) if sub else None,
            llm_provider=ai_cfg.llm_provider if ai_cfg else None,
            llm_model=ai_cfg.llm_model if ai_cfg else None
        ))
    return tenant_details

@router.put("/{org_id}/subscription", response_model=SubscriptionOut)
async def update_tenant_subscription(org_id: uuid.UUID, data: SubscriptionUpdate, super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(TenantSubscription).where(TenantSubscription.organization_id == org_id))
    sub = result.scalar_one_or_none()
    
    if not sub:
        sub = TenantSubscription(
            organization_id=org_id,
            plan_tier=data.plan_tier,
            max_agents=data.max_agents,
            max_api_calls=data.max_api_calls,
            is_suspended=data.is_suspended
        )
        db.add(sub)
    else:
        sub.plan_tier = data.plan_tier
        sub.max_agents = data.max_agents
        sub.max_api_calls = data.max_api_calls
        sub.is_suspended = data.is_suspended

    await db.commit()
    await db.refresh(sub)
    return sub

@router.put("/{org_id}/model-config", response_model=dict)
async def update_tenant_model(org_id: uuid.UUID, data: ModelConfigUpdate, super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(AIConfiguration).where(AIConfiguration.organization_id == org_id))
    ai_cfg = result.scalar_one_or_none()
    
    if not ai_cfg:
        raise HTTPException(status_code=404, detail="AI Configuration not found for this tenant")

    ai_cfg.llm_provider = data.llm_provider
    ai_cfg.llm_model = data.llm_model
    await db.commit()
    
    return {"message": "Model configuration updated", "llm_provider": ai_cfg.llm_provider, "llm_model": ai_cfg.llm_model}



