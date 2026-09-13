from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.core.security import get_password_hash
from app.modules.tenants.repository import tenant_repository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository, user_repository
from app.modules.users.schemas import UserCreate, UserUpdate


class UserService(BaseService[User, UserRepository]):
    def __init__(self, repository: UserRepository = user_repository):
        super().__init__(repository)

    def normalize_email(self, email: str) -> str:
        """Trim and convert email to lowercase for global consistency."""
        return email.strip().lower()

    def validate_role_and_tenant(self, db: Session, role: UserRole, tenant_id: Optional[str]) -> None:
        """Enforce multi-tenancy business invariants based on user role."""
        if role == UserRole.SUPER_ADMIN:
            if tenant_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="super_admin must have tenant_id = NULL (cannot be scoped to a single tenant)"
                )
        else:
            # gym_admin, coach, client MUST belong to an existing tenant
            if not tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{role.value}' requires a valid tenant_id"
                )
            tenant = tenant_repository.get(db, id=tenant_id)
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant with ID '{tenant_id}' does not exist"
                )

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create a new user with password hashing and invariant enforcement."""
        normalized_email = self.normalize_email(obj_in.email)

        # Check global email uniqueness
        existing_user = self.repository.get_by_email(db, email=normalized_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered"
            )

        # Validate role & tenant relationship
        self.validate_role_and_tenant(db, role=obj_in.role, tenant_id=obj_in.tenant_id)

        # Hash plaintext password using bcrypt
        hashed_password = get_password_hash(obj_in.password)

        create_data: Dict[str, Any] = {
            "email": normalized_email,
            "hashed_password": hashed_password,
            "full_name": obj_in.full_name,
            "role": obj_in.role.value,
            "tenant_id": obj_in.tenant_id,
            "is_active": True,
        }

        return self.repository.create(db, obj_in=create_data)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Fetch user by normalized email."""
        return self.repository.get_by_email(db, email=self.normalize_email(email))

    def update(
        self, db: Session, *, id: str, obj_in: Union[UserUpdate, Dict[str, Any]], tenant_id: Optional[str] = None
    ) -> Optional[User]:
        """Safely update user details."""
        user = self.get(db, id=id, tenant_id=tenant_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if isinstance(obj_in, dict):
            update_data = obj_in.copy()
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # If updating password, hash it and remove plaintext
        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

        # If updating role, validate with current or new tenant_id
        if "role" in update_data:
            new_role = update_data["role"]
            if isinstance(new_role, str):
                new_role = UserRole(new_role)
            target_tenant_id = update_data.get("tenant_id", user.tenant_id)
            self.validate_role_and_tenant(db, role=new_role, tenant_id=target_tenant_id)
            update_data["role"] = new_role.value

        return self.repository.update(db, db_obj=user, obj_in=update_data)


user_service = UserService()
