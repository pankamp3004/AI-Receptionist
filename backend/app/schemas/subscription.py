import uuid
from datetime import datetime
from pydantic import BaseModel

class SubscriptionUpdate(BaseModel):
    plan_tier: str
    max_agents: int
    max_api_calls: int
    is_suspended: bool

class SubscriptionOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    plan_tier: str
    max_agents: int
    max_api_calls: int
    is_suspended: bool
    updated_at: datetime

    model_config = {"from_attributes": True}

class ModelConfigUpdate(BaseModel):
    llm_provider: str
    llm_model: str
