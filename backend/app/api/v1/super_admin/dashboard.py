from fastapi import APIRouter
from sqlalchemy import select, func
from app.core.deps import DB, CurrentSuperAdmin
from app.models.organization import Organization
from app.models.memory import CallSession
from app.models.patient import Patient
from app.models.doctor import Doctor
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["super-admin-dashboard"])

class GlobalDashboardStats(BaseModel):
    total_organizations: int
    total_calls_handled: int
    total_patients_systemwide: int
    total_doctors_systemwide: int

@router.get("/stats", response_model=GlobalDashboardStats)
async def get_global_stats(super_admin: CurrentSuperAdmin, db: DB):
    async def count(model):
        result = await db.execute(select(func.count()).select_from(model))
        return result.scalar_one()

    return GlobalDashboardStats(
        total_organizations=await count(Organization),
        total_calls_handled=await count(CallSession),
        total_patients_systemwide=await count(Patient),
        total_doctors_systemwide=await count(Doctor)
    )
