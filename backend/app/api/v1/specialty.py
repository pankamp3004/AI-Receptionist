import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from app.core.deps import DB, CurrentAdmin
from app.schemas.specialty import (
    SpecialtyCreate, SpecialtyOut,
    SymptomCreate, SymptomOut,
    SpecSymCreate,
)
from app.crud import specialty as crud

router = APIRouter(prefix="/specialties", tags=["specialties"])
symptoms_router = APIRouter(prefix="/symptoms", tags=["symptoms"])


# ── Specialties ───────────────────────────────────────────────────────────────

@router.post("", response_model=SpecialtyOut, status_code=201)
async def create_specialty(data: SpecialtyCreate, admin: CurrentAdmin, db: DB):
    return await crud.create_specialty(db, admin.organization_id, data)


@router.get("", response_model=List[SpecialtyOut])
async def list_specialties(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 200):
    return await crud.list_specialties(db, admin.organization_id, skip, limit)


@router.get("/{spec_id}", response_model=SpecialtyOut)
async def get_specialty(spec_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_specialty(db, spec_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Specialty not found")
    return s


@router.delete("/{spec_id}", status_code=204)
async def delete_specialty(spec_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_specialty(db, spec_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Specialty not found")
    await crud.delete_specialty(db, s)


# ── Symptoms ──────────────────────────────────────────────────────────────────

@symptoms_router.post("", response_model=SymptomOut, status_code=201)
async def create_symptom(data: SymptomCreate, admin: CurrentAdmin, db: DB):
    return await crud.create_symptom(db, admin.organization_id, data)


@symptoms_router.get("", response_model=List[SymptomOut])
async def list_symptoms(admin: CurrentAdmin, db: DB, skip: int = 0, limit: int = 200):
    return await crud.list_symptoms(db, admin.organization_id, skip, limit)


@symptoms_router.get("/{sym_id}", response_model=SymptomOut)
async def get_symptom(sym_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_symptom(db, sym_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Symptom not found")
    return s


@symptoms_router.delete("/{sym_id}", status_code=204)
async def delete_symptom(sym_id: uuid.UUID, admin: CurrentAdmin, db: DB):
    s = await crud.get_symptom(db, sym_id, admin.organization_id)
    if not s:
        raise HTTPException(404, "Symptom not found")
    await crud.delete_symptom(db, s)
