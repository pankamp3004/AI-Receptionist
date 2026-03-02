import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.doctor import Doctor, DocShift
from app.models.specialty import DoctorSpecialty
from app.schemas.doctor import DoctorCreate, DoctorUpdate, ShiftCreate, ShiftUpdate


async def create_doctor(db: AsyncSession, org_id: uuid.UUID, data: DoctorCreate) -> Doctor:
    specialty_ids = data.specialty_ids
    doc_data = data.model_dump(exclude={"specialty_ids"})
    doctor = Doctor(organization_id=org_id, **doc_data)
    db.add(doctor)
    await db.flush()  # get doctor.id without committing

    # Assign specialties
    for spec_id in specialty_ids:
        link = DoctorSpecialty(doc_id=doctor.id, spec_id=spec_id)
        db.add(link)

    await db.commit()
    await db.refresh(doctor)
    return doctor


async def list_doctors(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Doctor]:
    result = await db.execute(
        select(Doctor)
        .where(Doctor.organization_id == org_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_doctor(
    db: AsyncSession, doctor_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[Doctor]:
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.organization_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_doctor(
    db: AsyncSession, doctor: Doctor, data: DoctorUpdate
) -> Doctor:
    update_data = data.model_dump(exclude_none=True, exclude={"specialty_ids"})
    for field, value in update_data.items():
        setattr(doctor, field, value)

    if data.specialty_ids is not None:
        # Replace specialties
        await db.execute(
            delete(DoctorSpecialty).where(DoctorSpecialty.doc_id == doctor.id)
        )
        for spec_id in data.specialty_ids:
            db.add(DoctorSpecialty(doc_id=doctor.id, spec_id=spec_id))

    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor


async def delete_doctor(db: AsyncSession, doctor: Doctor) -> None:
    await db.delete(doctor)
    await db.commit()


# ── Shifts ────────────────────────────────────────────────────────────────────

async def create_shift(
    db: AsyncSession, org_id: uuid.UUID, data: ShiftCreate
) -> DocShift:
    shift = DocShift(organization_id=org_id, **data.model_dump())
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


async def list_shifts(
    db: AsyncSession, org_id: uuid.UUID, doctor_id: Optional[uuid.UUID] = None
) -> List[DocShift]:
    query = select(DocShift).where(DocShift.organization_id == org_id)
    if doctor_id:
        query = query.where(DocShift.doc_id == doctor_id)
    result = await db.execute(query)
    return result.scalars().all()


async def get_shift(
    db: AsyncSession, shift_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[DocShift]:
    result = await db.execute(
        select(DocShift).where(DocShift.id == shift_id, DocShift.organization_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_shift(
    db: AsyncSession, shift: DocShift, data: ShiftUpdate
) -> DocShift:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(shift, field, value)
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


async def delete_shift(db: AsyncSession, shift: DocShift) -> None:
    await db.delete(shift)
    await db.commit()
