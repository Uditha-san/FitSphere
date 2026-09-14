from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.auth.service import auth_service
from app.modules.users.models import User
from app.modules.users.schemas import UserRead

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticate with email and password to receive a JWT access token."
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    return auth_service.authenticate(
        db,
        email=credentials.email,
        password=credentials.password
    )


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Current User Profile",
    description="Get profile details of the currently authenticated user."
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
) -> UserRead:
    return UserRead.model_validate(current_user)
