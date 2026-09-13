from typing import List, Optional, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import TokenPayload
from app.db.session import get_db

from app.modules.users.models import User, UserRole
from app.modules.users.repository import user_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    """Decode and validate JWT cryptographic signature, expiration, and payload structure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return token_data
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    db: Session = Depends(get_db),
    payload: TokenPayload = Depends(get_token_payload),
) -> User:
    """Fetch user entity from database using subject UUID claim."""
    user = user_repository.get(db, id=payload.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or credentials invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure that the authenticated user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


def get_current_tenant_id(
    current_user: User = Depends(get_current_active_user),
) -> Optional[str]:
    """
    Derive tenant context strictly from the authenticated user:
    - super_admin: returns None (global platform scope)
    - gym_admin, coach, client: returns user.tenant_id
    Raises 403 Forbidden if a tenant-scoped user is missing a tenant_id.
    """
    if current_user.role == UserRole.SUPER_ADMIN.value:
        return None

    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any tenant gym",
        )
    return current_user.tenant_id


class RoleChecker:
    """Reusable role-checking dependency."""
    def __init__(self, allowed_roles: List[Union[UserRole, str]]):
        self.allowed_roles = [
            r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles
        ]

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your user role",
            )
        return current_user


require_super_admin = RoleChecker([UserRole.SUPER_ADMIN])
require_gym_admin = RoleChecker([UserRole.SUPER_ADMIN, UserRole.GYM_ADMIN])
require_coach = RoleChecker([UserRole.SUPER_ADMIN, UserRole.GYM_ADMIN, UserRole.COACH])
