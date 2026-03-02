import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel
from app.models.patient import GenderEnum


# ── Patient Account ───────────────────────────────────────────────────────────

class PatientAccountCreate(BaseModel):
    mobile_no: str


class PatientAccountOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    mobile_no: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    account_id: uuid.UUID
    name: str
    gender: Optional[GenderEnum] = None
    dob: Optional[date] = None
    is_active: bool = True


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[GenderEnum] = None
    dob: Optional[date] = None
    is_active: Optional[bool] = None


class PatientOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    account_id: uuid.UUID
    name: str
    gender: Optional[GenderEnum]
    dob: Optional[date]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
