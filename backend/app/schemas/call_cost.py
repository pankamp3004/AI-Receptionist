"""
Pydantic schemas for call cost.

- CallCostClientOut  → hospital/clinic admin: total cost + duration only
- CallCostAdminOut   → super admin: full per-service breakdown
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CallCostClientOut(BaseModel):
    """What a hospital/clinic admin can see — total cost only."""
    session_id: uuid.UUID
    duration_seconds: int
    total_cost_usd: float
    created_at: datetime

    class Config:
        from_attributes = True


class CallCostAdminOut(BaseModel):
    """Full breakdown — main admin only."""
    id: uuid.UUID
    session_id: uuid.UUID
    organization_id: uuid.UUID
    duration_seconds: int
    tts_characters: int
    llm_input_tokens: int
    llm_output_tokens: int
    stt_cost_usd: float
    tts_cost_usd: float
    llm_cost_usd: float
    livekit_cost_usd: float
    total_cost_usd: float
    created_at: datetime

    class Config:
        from_attributes = True


class CallCostInline(BaseModel):
    """Minimal fields embedded inside call log list responses."""
    duration_seconds: Optional[int] = None
    total_cost_usd: Optional[float] = None

    class Config:
        from_attributes = True
