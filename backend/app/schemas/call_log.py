import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CallSessionCreate(BaseModel):
    phone_number: Optional[str] = None
    intent: Optional[str] = None
    outcome: Optional[str] = None
    transcript: Optional[str] = None
    confidence_score: Optional[float] = None
    ended_at: Optional[datetime] = None


class CallSessionOut(BaseModel):
    session_id: uuid.UUID
    organization_id: uuid.UUID
    phone_number: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    intent: Optional[str]
    outcome: Optional[str]
    transcript: Optional[str]
    confidence_score: Optional[float]

    model_config = {"from_attributes": True}


# Keep legacy alias for any code that still imports CallLogCreate/Out
CallLogCreate = CallSessionCreate
CallLogOut = CallSessionOut
