from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from pydantic import BaseModel, Field
import bcrypt
from jose import jwt

from app.core.config import settings


class TokenPayload(BaseModel):
    """Schema for validating and decoding JWT claims."""
    sub: str = Field(..., description="User UUID primary key")
    tenant_id: Optional[str] = Field(None, description="Tenant UUID (None for super_admin)")
    role: Optional[str] = Field(None, description="User role string")
    type: str = Field(default="access", description="Token type discriminator")
    iat: Optional[int] = Field(None, description="Issued at timestamp (UTC)")
    exp: Optional[int] = Field(None, description="Expiration timestamp (UTC)")



def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    # Enforce bcrypt 72 byte limit for safety
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(
    subject: Union[str, Any],
    tenant_id: Optional[str] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    """Generate a signed JWT access token with standard and custom claims."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "tenant_id": tenant_id,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

