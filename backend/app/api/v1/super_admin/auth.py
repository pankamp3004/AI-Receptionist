import logging
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.core.deps import DB
from app.core.security import verify_password, create_access_token, hash_password
from app.models.super_admin import SuperAdmin
from app.schemas.super_admin import SuperAdminCreate, SuperAdminOut, SuperAdminLogin, SuperAdminTokenResponse

router = APIRouter(prefix="/auth", tags=["super-admin-auth"])
logger = logging.getLogger(__name__)

@router.post("/login", response_model=SuperAdminTokenResponse)
async def super_admin_login(data: SuperAdminLogin, db: DB):
    result = await db.execute(select(SuperAdmin).where(SuperAdmin.email == data.email))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(data.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_access_token({"sub": str(admin.id), "is_super": True})
    return SuperAdminTokenResponse(
        access_token=token,
        super_admin_id=admin.id,
        super_admin_name=admin.name,
    )

@router.post("/setup", response_model=SuperAdminOut)
async def setup_first_super_admin(data: SuperAdminCreate, db: DB):
    """Temporary endpoint for creating the first super admin. You should secure this or disable it in production."""
    try:
        result = await db.execute(select(SuperAdmin).limit(1))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Super admin already exists. Cannot use setup endpoint.")

        hashed = hash_password(data.password)
        new_admin = SuperAdmin(name=data.name, email=data.email, hashed_password=hashed)
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        return new_admin
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to create first super admin")
        raise HTTPException(status_code=500, detail=f"Failed to create super admin: {type(exc).__name__}: {exc}") from exc
