import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.core.deps import DB, CurrentAdmin
from app.schemas.doctor import (
    DoctorCreate, DoctorOut, DoctorUpdate,
    ShiftCreate, ShiftOut, ShiftUpdate,
)
from app.crud import doctor as crud

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.post("", response_model=DoctorOut, status_code=201)
async def create(data: DoctorCreate, admin: CurrentAdmin, db: DB):
    return await crud.create_doctor(db, admin.organization_id, data)


@router.get("", response_model=List[DoctorOut])
async def list_all(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    return await crud.list_doctors(db, admin.organization_id, skip, limit)


@router.get("/{doctor_id}", response_model=DoctorOut)
async def get(doctor_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    doc = await crud.get_doctor(db, doctor_id, admin.organization_id)
    if not doc:
        raise HTTPException(404, "Doctor not found")
    return doc


@router.patch("/{doctor_id}", response_model=DoctorOut)
async def update(doctor_id: uuid.UUID, data: DoctorUpdate, admin: CurrentAdmin, db: DB):
    doc = await crud.get_doctor(db, doctor_id, admin.organization_id)
    if not doc:
        raise HTTPException(404, "Doctor not found")
    return await crud.update_doctor(db, doc, data)


@router.delete("/{doctor_id}", status_code=204)
async def delete(doctor_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    doc = await crud.get_doctor(db, doctor_id, admin.organization_id)
    if not doc:
        raise HTTPException(404, "Doctor not found")
    await crud.delete_doctor(db, doc)


# ── Shifts ─────────────────────────────────────────────────────────────────────
shifts_router = APIRouter(prefix="/shifts", tags=["shifts"])


@shifts_router.post("", response_model=ShiftOut, status_code=201)
async def create_shift(data: ShiftCreate, admin: CurrentAdmin, db: DB):
    doc = await crud.get_doctor(db, data.doc_id, admin.organization_id)
    if not doc:
        raise HTTPException(404, "Doctor not found")
    return await crud.create_shift(db, admin.organization_id, data)


@shifts_router.get("", response_model=List[ShiftOut])
async def list_shifts(
    admin: CurrentAdmin,
    db: DB,
    doctor_id: Optional[uuid.UUID] = Query(None),
):
    return await crud.list_shifts(db, admin.organization_id, doctor_id)


@shifts_router.get("/{shift_id}", response_model=ShiftOut)
async def get_shift(shift_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_shift(db, shift_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Shift not found")
    return s


@shifts_router.patch("/{shift_id}", response_model=ShiftOut)
async def update_shift(shift_id: uuid.UUID, data: ShiftUpdate, admin: CurrentAdmin, db: DB):
    s = await crud.get_shift(db, shift_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Shift not found")
    return await crud.update_shift(db, s, data)


@shifts_router.delete("/{shift_id}", status_code=204)
async def delete_shift(shift_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_shift(db, shift_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Shift not found")
    await crud.delete_shift(db, s)
