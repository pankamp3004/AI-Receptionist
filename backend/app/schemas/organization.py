import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class OrganizationCreate(BaseModel):
    name: str
    type: str = "hospital"
    phone: Optional[str] = None
    email: EmailStr
    address: Optional[str] = None
    timezone: str = "UTC"
    admin_name: str
    admin_password: str


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    phone: Optional[str]
    email: str
    address: Optional[str]
    timezone: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    organization_id: uuid.UUID
    admin_name: str
