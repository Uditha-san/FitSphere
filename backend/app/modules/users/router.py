from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate
from app.modules.users.service import user_service

router = APIRouter()


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new User",
    description="Create a user with hashed password and role-to-tenant relationship enforcement. "
                "TODO: Authentication will later restrict who can assign admin/coach roles."
)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create(db, obj_in=user_in)


@router.get(
    "/",
    response_model=List[UserRead],
    summary="List Users",
    description="List registered users. "
                "NOTE: The optional 'tenant_id' query parameter is purely for early local development/testing. "
                "It is NOT a security boundary. In future phases, tenant isolation will be derived strictly "
                "from the authenticated JWT session context."
)
def list_users(
    skip: int = 0,
    limit: int = 100,
    tenant_id: Optional[str] = Query(
        None,
        description="[DEV ONLY] Optional tenant filter for manual local testing. Not a security boundary."
    ),
    db: Session = Depends(get_db)
):
    return user_service.get_multi(db, skip=skip, limit=limit, tenant_id=tenant_id)


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Get User by ID",
    description="Fetch a user profile by UUID. Excludes password hash."
)
def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    user = user_service.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
