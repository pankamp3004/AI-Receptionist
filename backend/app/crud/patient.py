import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.patient import PatientAccount, Patient
from app.schemas.patient import PatientAccountCreate, PatientCreate, PatientUpdate


async def get_or_create_account(
    db: AsyncSession, org_id: uuid.UUID, data: PatientAccountCreate
) -> PatientAccount:
    result = await db.execute(
        select(PatientAccount).where(
            PatientAccount.organization_id == org_id,
            PatientAccount.mobile_no == data.mobile_no,
        )
    )
    account = result.scalar_one_or_none()
    if account:
        return account
    account = PatientAccount(organization_id=org_id, **data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def get_account(
    db: AsyncSession, account_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[PatientAccount]:
    result = await db.execute(
        select(PatientAccount).where(
            PatientAccount.id == account_id,
            PatientAccount.organization_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def list_accounts(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[PatientAccount]:
    result = await db.execute(
        select(PatientAccount)
        .where(PatientAccount.organization_id == org_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def create_patient(
    db: AsyncSession, org_id: uuid.UUID, data: PatientCreate
) -> Patient:
    patient = Patient(organization_id=org_id, **data.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


async def list_patients(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Patient]:
    result = await db.execute(
        select(Patient).where(Patient.organization_id == org_id).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def get_patient(
    db: AsyncSession, patient_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[Patient]:
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.organization_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_patient(
    db: AsyncSession, patient: Patient, data: PatientUpdate
) -> Patient:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


async def delete_patient(db: AsyncSession, patient: Patient) -> None:
    await db.delete(patient)
    await db.commit()
