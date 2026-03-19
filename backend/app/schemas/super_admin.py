import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr

class SuperAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class SuperAdminOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str

class SuperAdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    super_admin_id: uuid.UUID
    super_admin_name: str
