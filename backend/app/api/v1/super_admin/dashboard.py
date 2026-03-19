from fastapi import APIRouter
from sqlalchemy import select, func
from app.core.deps import DB, CurrentSuperAdmin
from app.models.organization import Organization
from app.models.memory import CallSession
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.call_cost import CallCost
from pydantic import BaseModel

from typing import List

router = APIRouter(prefix="/dashboard", tags=["super-admin-dashboard"])

class HospitalStat(BaseModel):
    id: str
    name: str
    patients: int
    doctors: int
    calls: int
    total_cost: float
    total_duration_seconds: int

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

@router.get("/hospital-stats", response_model=List[HospitalStat])
async def get_hospital_stats(super_admin: CurrentSuperAdmin, db: DB):
    result = await db.execute(select(Organization))
    orgs = result.scalars().all()
    
    stats = []
    for org in orgs:
        p_res = await db.execute(select(func.count()).select_from(Patient).where(Patient.organization_id == org.id))
        p_count = p_res.scalar() or 0
        
        d_res = await db.execute(select(func.count()).select_from(Doctor).where(Doctor.organization_id == org.id))
        d_count = d_res.scalar() or 0
        
        c_res = await db.execute(select(func.count()).select_from(CallSession).where(CallSession.organization_id == org.id))
        c_count = c_res.scalar() or 0
        
        cost_res = await db.execute(select(func.sum(CallCost.total_cost_usd)).select_from(CallCost).where(CallCost.organization_id == org.id))
        total_cost = cost_res.scalar() or 0.0
        
        duration_res = await db.execute(select(func.sum(CallCost.duration_seconds)).select_from(CallCost).where(CallCost.organization_id == org.id))
        total_duration = duration_res.scalar() or 0
        
        stats.append(HospitalStat(
            id=str(org.id), 
            name=org.name, 
            patients=p_count, 
            doctors=d_count,
            calls=c_count,
            total_cost=float(total_cost),
            total_duration_seconds=int(total_duration)
        ))
        
    return stats
