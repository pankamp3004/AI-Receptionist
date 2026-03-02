import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.specialty import Specialty, Symptoms, DoctorSpecialty, SpecSym
from app.schemas.specialty import (
    SpecialtyCreate, SymptomCreate, DoctorSpecialtyAdd, SpecSymCreate
)


# ── Specialty ──────────────────────────────────────────────────────────────────

async def create_specialty(
    db: AsyncSession, org_id: uuid.UUID, data: SpecialtyCreate
) -> Specialty:
    spec = Specialty(organization_id=org_id, **data.model_dump())
    db.add(spec)
    await db.commit()
    await db.refresh(spec)
    return spec


async def list_specialties(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 200
) -> List[Specialty]:
    result = await db.execute(
        select(Specialty)
        .where(Specialty.organization_id == org_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_specialty(
    db: AsyncSession, spec_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[Specialty]:
    result = await db.execute(
        select(Specialty).where(
            Specialty.id == spec_id, Specialty.organization_id == org_id
        )
    )
    return result.scalar_one_or_none()


async def delete_specialty(db: AsyncSession, spec: Specialty) -> None:
    await db.delete(spec)
    await db.commit()


# ── Symptoms ──────────────────────────────────────────────────────────────────

async def create_symptom(
    db: AsyncSession, org_id: uuid.UUID, data: SymptomCreate
) -> Symptoms:
    sym = Symptoms(organization_id=org_id, **data.model_dump())
    db.add(sym)
    await db.commit()
    await db.refresh(sym)
    return sym


async def list_symptoms(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 200
) -> List[Symptoms]:
    result = await db.execute(
        select(Symptoms)
        .where(Symptoms.organization_id == org_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_symptom(
    db: AsyncSession, sym_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[Symptoms]:
    result = await db.execute(
        select(Symptoms).where(
            Symptoms.id == sym_id, Symptoms.organization_id == org_id
        )
    )
    return result.scalar_one_or_none()


async def delete_symptom(db: AsyncSession, sym: Symptoms) -> None:
    await db.delete(sym)
    await db.commit()


# ── Spec ↔ Sym mapping ────────────────────────────────────────────────────────

async def add_spec_sym(
    db: AsyncSession, data: SpecSymCreate
) -> SpecSym:
    mapping = SpecSym(**data.model_dump())
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping
