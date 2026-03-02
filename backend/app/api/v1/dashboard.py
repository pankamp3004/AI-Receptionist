from fastapi import APIRouter
from sqlalchemy import select, func
from app.core.deps import DB, CurrentAdmin
from app.models.doctor import Doctor
from app.models.patient import Patient, PatientAccount
from app.models.appointment import Appointment, AppointmentStatusEnum
from app.models.memory import CallSession
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_doctors: int
    total_patients: int
    total_patient_accounts: int
    total_appointments: int
    total_calls: int
    booked_appointments: int
    completed_appointments: int
    cancelled_appointments: int


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(admin: CurrentAdmin, db: DB):
    org_id = admin.organization_id

    async def count(model, *filters):
        result = await db.execute(select(func.count()).select_from(model).where(*filters))
        return result.scalar_one()

    total_doctors = await count(Doctor, Doctor.organization_id == org_id)
    total_patients = await count(Patient, Patient.organization_id == org_id)
    total_accounts = await count(PatientAccount, PatientAccount.organization_id == org_id)
    total_appointments = await count(Appointment, Appointment.organization_id == org_id)
    total_calls = await count(CallSession, CallSession.organization_id == org_id)

    booked = await count(
        Appointment,
        Appointment.organization_id == org_id,
        Appointment.app_status.in_([
            AppointmentStatusEnum.Booked,
            AppointmentStatusEnum.Scheduled,
        ])
    )
    completed = await count(
        Appointment,
        Appointment.organization_id == org_id,
        Appointment.app_status == AppointmentStatusEnum.Completed,
    )
    cancelled = await count(
        Appointment,
        Appointment.organization_id == org_id,
        Appointment.app_status == AppointmentStatusEnum.Cancelled,
    )

    return DashboardStats(
        total_doctors=total_doctors,
        total_patients=total_patients,
        total_patient_accounts=total_accounts,
        total_appointments=total_appointments,
        total_calls=total_calls,
        booked_appointments=booked,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
    )
