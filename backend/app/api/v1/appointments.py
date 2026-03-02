import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from app.core.deps import DB, CurrentAdmin
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.crud import appointment as crud

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentOut, status_code=201)
async def create(data: AppointmentCreate, admin: CurrentAdmin, db: DB):
    return await crud.create_appointment(db, admin.organization_id, data)


@router.get("", response_model=List[AppointmentOut])
async def list_all(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    return await crud.list_appointments(db, admin.organization_id, skip, limit)


@router.get("/{appt_id}", response_model=AppointmentOut)
async def get(appt_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    a = await crud.get_appointment(db, appt_id, admin.organization_id)
    if not a:
        raise HTTPException(404, "Appointment not found")
    return a


@router.patch("/{appt_id}", response_model=AppointmentOut)
async def update(appt_id: uuid.UUID, data: AppointmentUpdate, admin: CurrentAdmin, db: DB):
    a = await crud.get_appointment(db, appt_id, admin.organization_id)
    if not a:
        raise HTTPException(404, "Appointment not found")
    return await crud.update_appointment(db, a, data)


@router.delete("/{appt_id}", status_code=204)
async def delete(appt_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    a = await crud.get_appointment(db, appt_id, admin.organization_id)
    if not a:
        raise HTTPException(404, "Appointment not found")
    await crud.delete_appointment(db, a)
