import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


async def create_appointment(
    db: AsyncSession, org_id: uuid.UUID, data: AppointmentCreate
) -> Appointment:
    appointment = Appointment(organization_id=org_id, **data.model_dump())
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def list_appointments(
    db: AsyncSession, org_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Appointment]:
    result = await db.execute(
        select(Appointment)
        .where(Appointment.organization_id == org_id)
        .order_by(Appointment.date_time.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_appointment(
    db: AsyncSession, appt_id: uuid.UUID, org_id: uuid.UUID
) -> Optional[Appointment]:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appt_id, Appointment.organization_id == org_id
        )
    )
    return result.scalar_one_or_none()


async def update_appointment(
    db: AsyncSession, appt: Appointment, data: AppointmentUpdate
) -> Appointment:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(appt, field, value)
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


async def delete_appointment(db: AsyncSession, appt: Appointment) -> None:
    await db.delete(appt)
    await db.commit()
