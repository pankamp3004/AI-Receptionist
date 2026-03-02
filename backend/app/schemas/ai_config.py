import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel


class AIConfigCreate(BaseModel):
    specialty_mappings: Dict[str, Any] = {}
    symptom_mappings: Dict[str, Any] = {}


class AIConfigUpdate(BaseModel):
    specialty_mappings: Optional[Dict[str, Any]] = None
    symptom_mappings: Optional[Dict[str, Any]] = None


class AIConfigOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    specialty_mappings: Dict[str, Any]
    symptom_mappings: Dict[str, Any]
    updated_at: datetime

    model_config = {"from_attributes": True}
