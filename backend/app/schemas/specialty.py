import uuid
from typing import Optional
from pydantic import BaseModel


class SpecialtyCreate(BaseModel):
    spec_name: str


class SpecialtyOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    spec_name: str

    model_config = {"from_attributes": True}


class SymptomCreate(BaseModel):
    sym_name: str


class SymptomOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    sym_name: str

    model_config = {"from_attributes": True}


class DoctorSpecialtyAdd(BaseModel):
    doc_id: uuid.UUID
    spec_id: uuid.UUID


class SpecSymCreate(BaseModel):
    spec_id: uuid.UUID
    sym_id: uuid.UUID
    confidence: Optional[float] = 1.0
