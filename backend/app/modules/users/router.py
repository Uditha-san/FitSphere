from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate
from app.modules.users.service import user_service

router = APIRouter()


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new User",
    description="Create a user with hashed password and role-to-tenant relationship enforcement. "
                "Gated by role: super_admin (all roles), gym_admin (coach and client in own tenant only)."
)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return user_service.create(db, obj_in=user_in, acting_user=current_user)


@router.get(
    "/",
    response_model=List[UserRead],
    summary="List Users",
    description="List registered users. Gated by role and tenant isolation."
)
def list_users(
    skip: int = 0,
    limit: int = 100,
    tenant_id: Optional[str] = Query(
        None,
        description="Optional administrative filter for super_admin."
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role == UserRole.CLIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: clients cannot list users"
        )

    if current_user.role in [UserRole.GYM_ADMIN.value, UserRole.COACH.value]:
        # TODO: For coaches, later this will be restricted to assigned clients when coach-client assignment exists.
        if tenant_id and tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access forbidden: you cannot list users from another gym"
            )
        effective_tenant_id = current_user.tenant_id
    else:
        # super_admin can view all users or filter by tenant_id
        effective_tenant_id = tenant_id

    return user_service.get_multi(db, skip=skip, limit=limit, tenant_id=effective_tenant_id)


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Get User by ID",
    description="Fetch a user profile by UUID. Enforces tenant isolation and self-access rules."
)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role == UserRole.CLIENT.value:
        if user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients may only access their own profile"
            )

    user = user_service.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role in [UserRole.GYM_ADMIN.value, UserRole.COACH.value]:
        # TODO: For coaches, later this will be restricted to assigned clients when coach-client assignment exists.
        if user.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access forbidden: you cannot access a user from another gym"
            )

    return user


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Update User Profile",
    description="Update safe user details with privilege escalation defenses."
)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return user_service.update(
        db,
        id=user_id,
        obj_in=user_in,
        acting_user=current_user
    )

