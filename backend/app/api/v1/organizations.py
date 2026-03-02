from fastapi import APIRouter, HTTPException
from app.core.deps import DB, CurrentAdmin
from app.schemas.organization import OrganizationOut, OrganizationUpdate
from app.crud.organization import get_organization, update_organization

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationOut)
async def get_my_org(admin: CurrentAdmin, db: DB):
    org = await get_organization(db, admin.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/me", response_model=OrganizationOut)
async def update_my_org(data: OrganizationUpdate, admin: CurrentAdmin, db: DB):
    org = await get_organization(db, admin.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return await update_organization(db, org, data)
