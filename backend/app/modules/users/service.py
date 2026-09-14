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

    def create(
        self, db: Session, *, obj_in: UserCreate, acting_user: Optional[User] = None
    ) -> User:
        """Create a new user with password hashing and invariant enforcement."""
        if acting_user:
            if acting_user.role in [UserRole.CLIENT.value, UserRole.COACH.value]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted for your user role: clients and coaches cannot create users",
                )
            elif acting_user.role == UserRole.GYM_ADMIN.value:
                # gym_admin can only create coach or client accounts
                if obj_in.role not in [UserRole.COACH, UserRole.CLIENT]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="gym_admin may only create coach or client accounts",
                    )
                # gym_admin cannot create user in another tenant
                if obj_in.tenant_id and obj_in.tenant_id != acting_user.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cross-tenant user creation forbidden: gym_admin can only create users in their own gym",
                    )
                # Force user to belong to gym_admin's tenant
                obj_in.tenant_id = acting_user.tenant_id
            elif acting_user.role == UserRole.SUPER_ADMIN.value:
                pass

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
        self,
        db: Session,
        *,
        id: str,
        obj_in: Union[UserUpdate, Dict[str, Any]],
        tenant_id: Optional[str] = None,
        acting_user: Optional[User] = None,
    ) -> Optional[User]:
        """Safely update user details with privilege escalation defenses."""
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

        if acting_user:
            if acting_user.role in [UserRole.CLIENT.value, UserRole.COACH.value]:
                if acting_user.id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Operation not permitted: you may only modify your own profile",
                    )
                if "role" in update_data or "tenant_id" in update_data or "is_active" in update_data:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Privilege escalation forbidden: cannot alter role, tenant, or active status",
                    )
            elif acting_user.role == UserRole.GYM_ADMIN.value:
                if user.tenant_id != acting_user.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cross-tenant modification forbidden",
                    )
                if "tenant_id" in update_data and update_data["tenant_id"] != user.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot alter tenant association",
                    )
                if "role" in update_data:
                    target_role = update_data["role"]
                    if isinstance(target_role, UserRole):
                        target_role = target_role.value
                    if target_role in [UserRole.SUPER_ADMIN.value, UserRole.GYM_ADMIN.value]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="gym_admin cannot promote users to admin roles",
                        )
            elif acting_user.role == UserRole.SUPER_ADMIN.value:
                pass

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
