import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.appointment import AppointmentStatusEnum


class AppointmentCreate(BaseModel):
    account_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    reason: Optional[str] = None
    date_time: datetime
    app_status: AppointmentStatusEnum = AppointmentStatusEnum.Booked


class AppointmentUpdate(BaseModel):
    reason: Optional[str] = None
    date_time: Optional[datetime] = None
    app_status: Optional[AppointmentStatusEnum] = None
    is_active: Optional[bool] = None


class AppointmentOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    account_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    reason: Optional[str]
    date_time: datetime
    app_status: AppointmentStatusEnum
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
