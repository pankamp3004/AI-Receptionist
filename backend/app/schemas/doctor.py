import uuid
from datetime import datetime, time
from typing import Optional, List
from pydantic import BaseModel
from app.models.doctor import DoctorStatusEnum, ShiftStatusEnum, WeekdayEnum
from app.schemas.specialty import SpecialtyOut


# ── Doctor ────────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str
    experiences: Optional[int] = None
    degree_doc: Optional[str] = None
    status: DoctorStatusEnum = DoctorStatusEnum.Active
    is_active: bool = True
    specialty_ids: List[uuid.UUID] = []  # list of specialty UUIDs to assign


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    experiences: Optional[int] = None
    degree_doc: Optional[str] = None
    status: Optional[DoctorStatusEnum] = None
    is_active: Optional[bool] = None
    specialty_ids: Optional[List[uuid.UUID]] = None


class DoctorOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    experiences: Optional[int]
    degree_doc: Optional[str]
    status: DoctorStatusEnum
    is_active: bool
    specialties: List[SpecialtyOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftCreate(BaseModel):
    doc_id: uuid.UUID
    day_of_week: WeekdayEnum
    start_time: time
    end_time: time
    status: ShiftStatusEnum = ShiftStatusEnum.Active


class ShiftUpdate(BaseModel):
    day_of_week: Optional[WeekdayEnum] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[ShiftStatusEnum] = None


class ShiftOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    doc_id: uuid.UUID
    day_of_week: WeekdayEnum
    start_time: time
    end_time: time
    status: ShiftStatusEnum

    model_config = {"from_attributes": True}
