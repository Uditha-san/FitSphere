from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.users.models import UserRole


class UserBase(BaseModel):
    email: str = Field(..., max_length=255, description="User email address")
    full_name: Optional[str] = Field(None, max_length=128)
    role: UserRole = UserRole.CLIENT
    tenant_id: Optional[str] = Field(
        None,
        description="UUID of the gym/tenant. Must be omitted/null for super_admin, required for other roles."
    )

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned or "@" not in cleaned:
            raise ValueError("Invalid email format: must contain '@'")
        parts = cleaned.split("@")
        if len(parts) != 2 or not parts[0] or "." not in parts[1]:
            raise ValueError("Invalid email format: must contain a valid domain (e.g. user@domain.com)")
        return cleaned


class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plaintext password, accepted ONLY upon creation. Hashed before storage."
    )


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=128)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=128,
        description="New plaintext password to update and hash."
    )


class UserRead(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
