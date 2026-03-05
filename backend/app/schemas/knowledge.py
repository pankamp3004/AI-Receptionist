"""
Pydantic schemas for KnowledgeDocument API.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class KnowledgeDocumentCreate(BaseModel):
    filename: str
    file_size_bytes: int


class KnowledgeDocumentOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    filename: str
    file_size_bytes: int
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
