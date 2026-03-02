from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.core.deps import DB
from app.core.security import verify_password, create_access_token
from app.schemas.organization import OrganizationCreate, OrganizationOut, LoginRequest, TokenResponse
from app.crud.organization import create_organization, get_admin_by_email

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
    token = create_access_token({"sub": str(admin.id), "org_id": str(admin.organization_id)})
    return TokenResponse(
        access_token=token,
        organization_id=admin.organization_id,
        admin_name=admin.name,
    )
