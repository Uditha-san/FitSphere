from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.assignments.repository import assignment_repository
from app.modules.progress.models import ProgressRecord
from app.modules.progress.repository import (
    ProgressRecordRepository,
    progress_repository,
)
from app.modules.progress.schemas import (
    ProgressRecordCreate,
    ProgressRecordUpdate,
    ProgressLatestSummary,
)
from app.modules.sessions.repository import training_session_repository
from app.modules.training_plans.repository import training_plan_repository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import user_repository


class ProgressRecordService(
    BaseService[ProgressRecord, ProgressRecordRepository]
):
    def __init__(
        self,
        repository: ProgressRecordRepository = progress_repository,
    ):
        super().__init__(repository)

    # -------------------------------------------------------------------------
    # Access Control Helpers
    # -------------------------------------------------------------------------

    def _check_access(self, record: ProgressRecord, acting_user: User) -> None:
        """Enforce tenant and role boundaries for viewing a progress record."""
        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return

        # Tenant isolation
        if record.tenant_id != acting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cross-tenant access forbidden",
            )

        # Role scoping
        if acting_user.role == UserRole.COACH.value:
            if record.coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: coaches may only view their own progress records",
                )
        elif acting_user.role == UserRole.CLIENT.value:
            if record.client_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: clients may only view their own progress records",
                )

    def _check_mutation_access(self, record: ProgressRecord, acting_user: User) -> None:
        """Enforce tenant and role boundaries for creating, modifying or deleting a progress record."""
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot create, update, or delete progress records",
            )

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return

        # Tenant isolation
        if record.tenant_id != acting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cross-tenant mutation forbidden",
            )

        # Coach ownership check
        if acting_user.role == UserRole.COACH.value:
            if record.coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: coaches can only manage their own progress records",
                )

    # -------------------------------------------------------------------------
    # Core Domain Operations
    # -------------------------------------------------------------------------

    def create(
        self,
        db: Session,
        *,
        obj_in: ProgressRecordCreate,
        acting_user: User,
    ) -> ProgressRecord:
        """Create a new progress record enforcing RBAC, coach-client assignments, and referential integrity."""
        # 1. Clients cannot create records
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot create progress records",
            )

        # 2. Determine and validate coach ID
        effective_coach_id = obj_in.coach_id
        if acting_user.role == UserRole.COACH.value:
            if effective_coach_id and effective_coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: coaches can only create progress records for their own clients",
                )
            effective_coach_id = acting_user.id
        elif not effective_coach_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="coach_id is required when creating a progress record as administrator",
            )

        # 3. Validate coach existence, role, and active status
        coach = user_repository.get(db, id=effective_coach_id)
        if not coach:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Coach with ID '{effective_coach_id}' not found",
            )
        if coach.role != UserRole.COACH.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{effective_coach_id}' is not a coach (role: {coach.role})",
            )
        if not coach.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Coach '{coach.email}' is inactive and cannot record progress",
            )

        # 4. Validate client existence, role, and active status
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
                detail=f"Client '{client.email}' is inactive and cannot have progress recorded",
            )

        # 5. Validate same-tenant invariant
        if coach.tenant_id != client.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-tenant progress record rejected: coach and client must belong to the same gym tenant",
            )

        # 6. Gym admin boundary check
        if acting_user.role == UserRole.GYM_ADMIN.value:
            if coach.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant progress record forbidden: you may only record progress for your own gym",
                )

        # 7. Active coach-client assignment validation
        assignment = assignment_repository.get_active_assignment(
            db, coach_id=coach.id, client_id=client.id
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active coach-client assignment required: coach must be actively assigned to this client",
            )

        # 8. Validate optional training session reference
        if obj_in.training_session_id:
            sess = training_session_repository.get(db, id=obj_in.training_session_id)
            if not sess:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Training session with ID '{obj_in.training_session_id}' not found",
                )
            if sess.tenant_id != coach.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training session reference: session belongs to a different tenant",
                )
            if sess.coach_id != coach.id or sess.client_id != client.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training session reference: session coach/client does not match this record",
                )

        # 9. Validate optional training plan reference
        if obj_in.training_plan_id:
            plan = training_plan_repository.get(db, id=obj_in.training_plan_id)
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Training plan with ID '{obj_in.training_plan_id}' not found",
                )
            if plan.tenant_id != coach.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training plan reference: plan belongs to a different tenant",
                )
            if plan.coach_id != coach.id or plan.client_id != client.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training plan reference: plan coach/client does not match this record",
                )

        # 10. Consistency between training session and training plan if both are supplied
        if obj_in.training_session_id and obj_in.training_plan_id:
            sess = training_session_repository.get(db, id=obj_in.training_session_id)
            if sess and sess.training_plan_id and sess.training_plan_id != obj_in.training_plan_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inconsistent references: training session is linked to a different training plan",
                )

        # 11. Create and persist
        record = ProgressRecord(
            tenant_id=coach.tenant_id,
            coach_id=coach.id,
            client_id=client.id,
            recorded_at=obj_in.recorded_at,
            weight_kg=obj_in.weight_kg,
            body_fat_percentage=obj_in.body_fat_percentage,
            chest_cm=obj_in.chest_cm,
            waist_cm=obj_in.waist_cm,
            hip_cm=obj_in.hip_cm,
            arm_cm=obj_in.arm_cm,
            thigh_cm=obj_in.thigh_cm,
            notes=obj_in.notes,
            training_session_id=obj_in.training_session_id,
            training_plan_id=obj_in.training_plan_id,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return self.repository.get_with_details(db, record.id) or record

    def get_with_details(
        self,
        db: Session,
        id: str,
        acting_user: User,
    ) -> ProgressRecord:
        """Fetch a progress record with details and authorize access."""
        record = self.repository.get_with_details(db, id=id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Progress record with ID '{id}' not found",
            )
        self._check_access(record, acting_user)
        return record

    def get_multi_scoped(
        self,
        db: Session,
        *,
        acting_user: User,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ProgressRecord]:
        """Fetch progress records scoped strictly to the acting user's role and tenant."""
        tenant_id: Optional[str] = None
        effective_coach_id = coach_id
        effective_client_id = client_id

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            pass  # Full access
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.COACH.value:
            tenant_id = acting_user.tenant_id
            effective_coach_id = acting_user.id
        elif acting_user.role == UserRole.CLIENT.value:
            tenant_id = acting_user.tenant_id
            effective_client_id = acting_user.id

        return self.repository.get_multi_filtered(
            db,
            tenant_id=tenant_id,
            coach_id=effective_coach_id,
            client_id=effective_client_id,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )

    def get_client_history(
        self,
        db: Session,
        *,
        client_id: str,
        acting_user: User,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ProgressRecord]:
        """Fetch historical progress records for a specific client enforcing role & tenant scope."""
        client = user_repository.get(db, id=client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID '{client_id}' not found",
            )

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            tenant_id = None
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )
            tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.COACH.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )
            # Verify assignment
            assignment = assignment_repository.get_active_assignment(
                db, coach_id=acting_user.id, client_id=client.id
            )
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: coaches may only view progress history of their assigned clients",
                )
            tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.CLIENT.value:
            if acting_user.id != client_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: clients may only view their own progress history",
                )
            tenant_id = acting_user.tenant_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        return self.repository.get_client_history(
            db,
            client_id=client_id,
            tenant_id=tenant_id,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )

    def get_client_summary(
        self,
        db: Session,
        *,
        client_id: str,
        acting_user: User,
    ) -> ProgressLatestSummary:
        """Calculate and return overall progress stats and latest measurements for a client."""
        client = user_repository.get(db, id=client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with ID '{client_id}' not found",
            )

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            tenant_id = None
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )
            tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.COACH.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )
            assignment = assignment_repository.get_active_assignment(
                db, coach_id=acting_user.id, client_id=client.id
            )
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: coaches may only view progress summary of their assigned clients",
                )
            tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.CLIENT.value:
            if acting_user.id != client_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: clients may only view their own progress summary",
                )
            tenant_id = acting_user.tenant_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        return self.repository.get_client_summary_stats(
            db,
            client_id=client_id,
            tenant_id=tenant_id,
        )

    def update(
        self,
        db: Session,
        *,
        id: str,
        obj_in: ProgressRecordUpdate,
        acting_user: User,
    ) -> ProgressRecord:
        """Update a progress record enforcing authorization and referential checks."""
        record = self.repository.get(db, id=id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Progress record with ID '{id}' not found",
            )

        self._check_mutation_access(record, acting_user)

        # Validate training session reference if changing
        if obj_in.training_session_id is not None:
            if obj_in.training_session_id != "":
                sess = training_session_repository.get(db, id=obj_in.training_session_id)
                if not sess:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Training session with ID '{obj_in.training_session_id}' not found",
                    )
                if sess.tenant_id != record.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid training session reference: session belongs to a different tenant",
                    )
                if sess.coach_id != record.coach_id or sess.client_id != record.client_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid training session reference: session coach/client does not match this record",
                    )
                record.training_session_id = obj_in.training_session_id
            else:
                record.training_session_id = None

        # Validate training plan reference if changing
        if obj_in.training_plan_id is not None:
            if obj_in.training_plan_id != "":
                plan = training_plan_repository.get(db, id=obj_in.training_plan_id)
                if not plan:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Training plan with ID '{obj_in.training_plan_id}' not found",
                    )
                if plan.tenant_id != record.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid training plan reference: plan belongs to a different tenant",
                    )
                if plan.coach_id != record.coach_id or plan.client_id != record.client_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid training plan reference: plan coach/client does not match this record",
                    )
                record.training_plan_id = obj_in.training_plan_id
            else:
                record.training_plan_id = None

        update_dict = obj_in.model_dump(
            exclude_unset=True,
            exclude={"training_session_id", "training_plan_id"},
        )
        for field, value in update_dict.items():
            setattr(record, field, value)

        db.commit()
        db.refresh(record)
        return self.repository.get_with_details(db, record.id) or record

    def delete(
        self,
        db: Session,
        *,
        id: str,
        acting_user: User,
    ) -> None:
        """Delete a progress record enforcing authorization."""
        record = self.repository.get(db, id=id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Progress record with ID '{id}' not found",
            )

        self._check_mutation_access(record, acting_user)
        self.repository.remove(db, id=id)


progress_service = ProgressRecordService()
