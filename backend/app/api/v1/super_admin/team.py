import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from app.core.deps import DB, CurrentSuperAdmin
from app.core.security import hash_password
from app.models.super_admin import SuperAdmin
from app.schemas.super_admin import SuperAdminOut, SuperAdminCreate

router = APIRouter(prefix="/team", tags=["super-admin-team"])

class PasswordUpdate(BaseModel):
    new_password: str

@router.get("", response_model=List[SuperAdminOut])
async def list_team_members(super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(SuperAdmin))
    admins = result.scalars().all()
    return admins

@router.post("", response_model=SuperAdminOut)
async def create_team_member(data: SuperAdminCreate, super_admin: CurrentSuperAdmin, db: DB):
    # Check if exists
    result = await db.execute(select(SuperAdmin).where(SuperAdmin.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Super Admin with this email already exists")
        
    hashed = hash_password(data.password)
    new_admin = SuperAdmin(name=data.name, email=data.email, hashed_password=hashed)
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin

@router.put("/{admin_id}/password")
async def update_password(admin_id: uuid.UUID, data: PasswordUpdate, super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(SuperAdmin).where(SuperAdmin.id == admin_id))
    admin_to_edit = result.scalar_one_or_none()
    
    if not admin_to_edit:
        raise HTTPException(status_code=404, detail="Super admin not found")
        
    admin_to_edit.hashed_password = hash_password(data.new_password)
    await db.commit()
    
    return {"message": "Password updated successfully"}

@router.delete("/{admin_id}")
async def delete_team_member(admin_id: uuid.UUID, super_admin: CurrentSuperAdmin, db: DB):
    # Enforce minimum 1 super admin rule
    count_res = await db.execute(select(func.count()).select_from(SuperAdmin))
    total_admins = count_res.scalar()
    
    if total_admins <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last remaining super administrator.")
        
    result = await db.execute(select(SuperAdmin).where(SuperAdmin.id == admin_id))
    admin_to_delete = result.scalar_one_or_none()
    
    if not admin_to_delete:
        raise HTTPException(status_code=404, detail="Super admin not found")
        
    await db.delete(admin_to_delete)
    await db.commit()
    
    return {"message": "Team member removed successfully"}
