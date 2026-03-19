from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.core.deps import DB
from app.core.security import verify_password, create_access_token
from app.schemas.organization import OrganizationCreate, OrganizationOut, LoginRequest, TokenResponse
from app.crud.organization import create_organization, get_admin_by_email
from app.models.subscription import TenantSubscription

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def register(data: OrganizationCreate, db: DB):
    existing = await get_admin_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    org, admin = await create_organization(db, data)
    return org


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DB):
    admin = await get_admin_by_email(db, data.email)
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    sub_res = await db.execute(select(TenantSubscription).where(TenantSubscription.organization_id == admin.organization_id))
    sub = sub_res.scalar_one_or_none()
    if sub and sub.is_suspended:
        raise HTTPException(status_code=403, detail="Organization account is suspended. Please contact support.")

    token = create_access_token({"sub": str(admin.id), "org_id": str(admin.organization_id)})
    return TokenResponse(
        access_token=token,
        organization_id=admin.organization_id,
        admin_name=admin.name,
    )
