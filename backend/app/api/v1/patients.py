import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from app.core.deps import DB, CurrentAdmin
from app.schemas.patient import (
    PatientAccountCreate, PatientAccountOut,
    PatientCreate, PatientOut, PatientUpdate
)
from app.crud import patient as crud

router = APIRouter(prefix="/patients", tags=["patients"])


# ── Patient Accounts ──────────────────────────────────────────────────────────

@router.post("/accounts", response_model=PatientAccountOut, status_code=201)
async def create_or_get_account(data: PatientAccountCreate, admin: CurrentAdmin, db: DB):
    """Create a patient account by mobile number (idempotent — returns existing if found)."""
    return await crud.get_or_create_account(db, admin.organization_id, data)


@router.get("/accounts", response_model=List[PatientAccountOut])
async def list_accounts(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    return await crud.list_accounts(db, admin.organization_id, skip, limit)


# ── Patients ──────────────────────────────────────────────────────────────────

@router.post("", response_model=PatientOut, status_code=201)
async def create(data: PatientCreate, admin: CurrentAdmin, db: DB):
    # Verify account belongs to same org
    account = await crud.get_account(db, data.account_id, admin.organization_id)
    if not account:
        raise HTTPException(404, "Patient account not found")
    return await crud.create_patient(db, admin.organization_id, data)


@router.get("", response_model=List[PatientOut])
async def list_all(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 100):
    return await crud.list_patients(db, admin.organization_id, skip, limit)


@router.get("/{patient_id}", response_model=PatientOut)
async def get(patient_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    p = await crud.get_patient(db, patient_id, admin.organization_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


@router.patch("/{patient_id}", response_model=PatientOut)
async def update(patient_id: uuid.UUID, data: PatientUpdate, admin: CurrentAdmin, db: DB):
    p = await crud.get_patient(db, patient_id, admin.organization_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    return await crud.update_patient(db, p, data)


@router.delete("/{patient_id}", status_code=204)
async def delete(patient_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    p = await crud.get_patient(db, patient_id, admin.organization_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    await crud.delete_patient(db, p)
