from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.assignments.models import CoachClientAssignment
from app.modules.assignments.repository import (
    CoachClientAssignmentRepository,
    assignment_repository,
)
from app.modules.assignments.schemas import (
    CoachClientAssignmentCreate,
    CoachClientAssignmentUpdate,
)
from app.modules.users.models import User, UserRole
from app.modules.users.repository import user_repository


class CoachClientAssignmentService(
    BaseService[CoachClientAssignment, CoachClientAssignmentRepository]
):
    def __init__(self, repository: CoachClientAssignmentRepository = assignment_repository):
        super().__init__(repository)

    def create(
        self,
        db: Session,
        *,
        obj_in: CoachClientAssignmentCreate,
        acting_user: User,
    ) -> CoachClientAssignment:
        """Create a new assignment between a coach and a client with full invariant and RBAC enforcement."""
        # 1. Role-based authorization
        if acting_user.role in [UserRole.CLIENT.value, UserRole.COACH.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients and coaches cannot create assignments",
            )

        # 2. Validate coach existence, role, and active status
        coach = user_repository.get(db, id=obj_in.coach_id)
        if not coach:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Coach with ID '{obj_in.coach_id}' not found",
            )
        if coach.role != UserRole.COACH.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{obj_in.coach_id}' is not a coach (role: {coach.role})",
            )
        if not coach.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coach '{coach.email}' is inactive and cannot be assigned",
            )

        # 3. Validate client existence, role, and active status
        client = user_repository.get(db, id=obj_in.client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID '{obj_in.client_id}' not found",
            )
        if client.role != UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{obj_in.client_id}' is not a client (role: {client.role})",
            )
        if not client.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Client '{client.email}' is inactive and cannot be assigned",
            )

        # 4. Validate same-tenant invariant
        if coach.tenant_id != client.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-tenant assignment rejected: coach and client must belong to the same gym tenant",
            )

        # 5. Validate gym_admin tenant boundary
        if acting_user.role == UserRole.GYM_ADMIN.value:
            if coach.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant assignment forbidden: you may only create assignments inside your own gym",
                )
            if obj_in.tenant_id and obj_in.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant assignment forbidden: client-supplied tenant_id does not match your gym",
                )

        assignment_tenant_id = coach.tenant_id

        # 6. Service-level duplicate check for friendly error message
        existing = self.repository.get_active_assignment(
            db, coach_id=obj_in.coach_id, client_id=obj_in.client_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate active assignment: client is already assigned to this coach",
            )

        # 7. Persist with database constraint race-condition fallback
        try:
            create_data = {
                "tenant_id": assignment_tenant_id,
                "coach_id": obj_in.coach_id,
                "client_id": obj_in.client_id,
                "is_active": True,
            }
            return self.repository.create(db, obj_in=create_data)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate active assignment: client is already actively assigned to this coach",
            )

    def get(self, db: Session, *, id: str, acting_user: User) -> CoachClientAssignment:
        """Fetch assignment with strict tenant isolation and role-scoped access control."""
        assignment = self.repository.get(db, id=id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return assignment
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            if assignment.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access forbidden",
                )
        elif acting_user.role == UserRole.COACH.value:
            if (
                assignment.tenant_id != acting_user.tenant_id
                or assignment.coach_id != acting_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: you can only view your own assignments",
                )
        elif acting_user.role == UserRole.CLIENT.value:
            if (
                assignment.tenant_id != acting_user.tenant_id
                or assignment.client_id != acting_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: you can only view your own assignments",
                )

        return assignment

    def get_multi(
        self,
        db: Session,
        *,
        acting_user: User,
        skip: int = 0,
        limit: int = 100,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[CoachClientAssignment]:
        """List assignments scoped strictly by caller role and tenant boundary."""
        if acting_user.role == UserRole.CLIENT.value:
            effective_client_id = acting_user.id
            effective_coach_id = coach_id
            effective_tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.COACH.value:
            effective_coach_id = acting_user.id
            effective_client_id = client_id
            effective_tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            if tenant_id and tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access forbidden",
                )
            effective_tenant_id = acting_user.tenant_id
            effective_coach_id = coach_id
            effective_client_id = client_id
        else:  # super_admin
            effective_tenant_id = tenant_id
            effective_coach_id = coach_id
            effective_client_id = client_id

        return self.repository.get_multi_filtered(
            db,
            tenant_id=effective_tenant_id,
            coach_id=effective_coach_id,
            client_id=effective_client_id,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    def deactivate(
        self,
        db: Session,
        *,
        id: str,
        acting_user: User,
    ) -> CoachClientAssignment:
        """Deactivate an active assignment preserving historical record for audit and future workflows."""
        if acting_user.role in [UserRole.CLIENT.value, UserRole.COACH.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients and coaches cannot remove assignments",
            )

        assignment = self.repository.get(db, id=id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )

        if (
            acting_user.role == UserRole.GYM_ADMIN.value
            and assignment.tenant_id != acting_user.tenant_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant operation forbidden: you may only manage assignments in your own gym",
            )

        return self.repository.update(db, db_obj=assignment, obj_in={"is_active": False})


assignment_service = CoachClientAssignmentService()
