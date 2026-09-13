from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, description="Name of the gym or tenant")


class TenantCreate(TenantBase):
    slug: Optional[str] = Field(None, max_length=128, description="Optional custom URL slug. Generated automatically if omitted.")


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    slug: Optional[str] = Field(None, max_length=128, description="Updated slug (administrative operation)")
    is_active: Optional[bool] = None


class TenantRead(TenantBase):
    id: str
    slug: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
