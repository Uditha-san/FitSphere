from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.modules.auth.schemas import TokenResponse
from app.modules.users.repository import UserRepository, user_repository
from app.modules.users.schemas import UserRead


class AuthService:
    def __init__(self, user_repo: UserRepository = user_repository):
        self.user_repository = user_repo

    def authenticate(self, db: Session, *, email: str, password: str) -> TokenResponse:
        """
        Authenticate user credentials and issue a signed JWT access token.
        Enforces:
        - Email normalization
        - Generic 401 error message to prevent account enumeration
        - Inactive user rejection with 403 Forbidden
        """
        normalized_email = email.strip().lower()
        user = self.user_repository.get_by_email(db, email=normalized_email)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user account",
            )

        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id,
            tenant_id=user.tenant_id,
            role=user.role,
            expires_delta=expires_delta,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=int(expires_delta.total_seconds()),
            user=UserRead.model_validate(user),
        )


auth_service = AuthService()
