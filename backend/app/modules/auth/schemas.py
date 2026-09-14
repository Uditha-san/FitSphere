from typing import Optional
from pydantic import BaseModel, Field, field_validator

from app.modules.users.schemas import UserRead


class LoginRequest(BaseModel):
    """Schema for user login credentials."""
    email: str = Field(..., max_length=255, description="Registered email address")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")

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


class TokenResponse(BaseModel):
    """Schema returned upon successful authentication."""
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token type, always 'bearer'")
    expires_in: int = Field(..., description="Token lifespan in seconds")
    user: UserRead = Field(..., description="Safe user profile (strictly excludes password)")


from app.core.security import TokenPayload

