from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.organization import Admin
from app.models.super_admin import SuperAdmin
from app.models.subscription import TenantSubscription
import uuid

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_admin(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    admin_id: str = payload.get("sub")
    org_id: str = payload.get("org_id")
    if not admin_id or not org_id:
        raise credentials_exception

    result = await db.execute(select(Admin).where(Admin.id == uuid.UUID(admin_id)))
    admin = result.scalar_one_or_none()
    if not admin:
        raise credentials_exception
    
    # Check suspension status
    sub_res = await db.execute(select(TenantSubscription).where(TenantSubscription.organization_id == uuid.UUID(org_id)))
    sub = sub_res.scalar_one_or_none()
    if sub and sub.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization account is suspended.")

    return admin


async def get_current_super_admin(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuperAdmin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate super admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    admin_id: str = payload.get("sub")
    is_super: bool = payload.get("is_super", False)
    
    if not admin_id or not is_super:
        raise credentials_exception

    result = await db.execute(select(SuperAdmin).where(SuperAdmin.id == uuid.UUID(admin_id)))
    super_admin = result.scalar_one_or_none()
    if not super_admin or not super_admin.is_active:
        raise credentials_exception
    return super_admin


CurrentAdmin = Annotated[Admin, Depends(get_current_admin)]
CurrentSuperAdmin = Annotated[SuperAdmin, Depends(get_current_super_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]
