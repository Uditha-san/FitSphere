from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.assignments.repository import assignment_repository
from app.modules.sessions.models import (
    SessionStatus,
    SessionType,
    TrainingSession,
)
from app.modules.sessions.repository import (
    TrainingSessionRepository,
    training_session_repository,
)
from app.modules.sessions.schemas import (
    TrainingSessionCreate,
    TrainingSessionUpdate,
)
from app.modules.training_plans.repository import training_plan_repository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import user_repository


VALID_STATUS_TRANSITIONS = {
    SessionStatus.SCHEDULED.value: {
        SessionStatus.CONFIRMED.value,
        SessionStatus.IN_PROGRESS.value,
        SessionStatus.CANCELLED.value,
        SessionStatus.NO_SHOW.value,
    },
    SessionStatus.CONFIRMED.value: {
        SessionStatus.IN_PROGRESS.value,
        SessionStatus.CANCELLED.value,
        SessionStatus.NO_SHOW.value,
    },
    SessionStatus.IN_PROGRESS.value: {
        SessionStatus.COMPLETED.value,
        SessionStatus.CANCELLED.value,
    },
    SessionStatus.COMPLETED.value: set(),
    SessionStatus.CANCELLED.value: set(),
    SessionStatus.NO_SHOW.value: set(),
}

TERMINAL_STATUSES = {
    SessionStatus.COMPLETED.value,
    SessionStatus.CANCELLED.value,
    SessionStatus.NO_SHOW.value,
}


class TrainingSessionService(
    BaseService[TrainingSession, TrainingSessionRepository]
):
    def __init__(
        self,
        repository: TrainingSessionRepository = training_session_repository,
    ):
        super().__init__(repository)

    # -------------------------------------------------------------------------
    # Access Control Helpers
    # -------------------------------------------------------------------------

    def _check_access(self, session: TrainingSession, acting_user: User) -> None:
        """Enforce tenant and role boundaries for viewing/reading a session."""
        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return

        # Tenant isolation
        if session.tenant_id != acting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cross-tenant access forbidden",
            )

        # Role-specific scoping
        if acting_user.role == UserRole.COACH.value:
            if session.coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: coaches may only view their own sessions",
                )
        elif acting_user.role == UserRole.CLIENT.value:
            if session.client_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: clients may only view their own sessions",
                )

    def _check_mutation_access(self, session: TrainingSession, acting_user: User) -> None:
        """Enforce tenant and role boundaries for modifying/transitioning a session."""
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot modify or cancel training sessions",
            )

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return

        # Tenant isolation
        if session.tenant_id != acting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cross-tenant mutation forbidden",
            )

        # Coach ownership check
        if acting_user.role == UserRole.COACH.value:
            if session.coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: coaches can only manage their own sessions",
                )

    # -------------------------------------------------------------------------
    # Core Domain Operations
    # -------------------------------------------------------------------------

    def create(
        self,
        db: Session,
        *,
        obj_in: TrainingSessionCreate,
        acting_user: User,
    ) -> TrainingSession:
        """Create a training session enforcing RBAC, assignments, overlap prevention, and referential integrity."""
        # 1. Clients cannot create sessions
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot schedule sessions",
            )

        # 2. Validate time range
        if obj_in.scheduled_end <= obj_in.scheduled_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time range: scheduled_end must be later than scheduled_start",
            )

        # 3. Determine and validate coach ID
        effective_coach_id = obj_in.coach_id
        if acting_user.role == UserRole.COACH.value:
            if effective_coach_id and effective_coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: coaches can only schedule sessions for themselves",
                )
            effective_coach_id = acting_user.id
        elif not effective_coach_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="coach_id is required when creating a session as administrator",
            )

        # 4. Validate coach existence, role, and active status
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
                detail=f"Coach '{coach.email}' is inactive and cannot be scheduled",
            )

        # 5. Validate client existence, role, and active status
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
                detail=f"Client '{client.email}' is inactive and cannot be scheduled",
            )

        # 6. Validate same-tenant invariant
        if coach.tenant_id != client.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-tenant session rejected: coach and client must belong to the same gym tenant",
            )

        # 7. Gym admin boundary check
        if acting_user.role == UserRole.GYM_ADMIN.value:
            if coach.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant session forbidden: you may only create sessions for your own gym",
                )

        # 8. Active coach-client assignment validation
        assignment = assignment_repository.get_active_assignment(
            db, coach_id=coach.id, client_id=client.id
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active coach-client assignment required: coach must be actively assigned to this client",
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
                    detail="Invalid training plan reference: plan does not match this coach and client assignment",
                )

            # 10. Validate optional workout day reference
            if obj_in.workout_day_id:
                day = training_plan_repository.get_day(db, id=obj_in.workout_day_id)
                if not day:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Workout day with ID '{obj_in.workout_day_id}' not found",
                    )
                if day.training_plan_id != plan.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid workout day reference: workout day does not belong to the selected training plan",
                    )
                if day.tenant_id != coach.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid workout day reference: workout day belongs to a different tenant",
                    )
        elif obj_in.workout_day_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot specify workout_day_id without a valid training_plan_id",
            )

        # 11. Validate session type
        session_type = (obj_in.session_type or SessionType.PERSONAL_TRAINING.value).lower()
        if session_type not in [t.value for t in SessionType]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid session type '{session_type}'. Valid values: {[t.value for t in SessionType]}",
            )

        # 12. Prevent overlapping coach sessions
        overlapping = self.repository.check_coach_overlap(
            db,
            coach_id=coach.id,
            scheduled_start=obj_in.scheduled_start,
            scheduled_end=obj_in.scheduled_end,
        )
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Schedule conflict: Coach already has a session scheduled between "
                       f"{overlapping.scheduled_start.isoformat()} and {overlapping.scheduled_end.isoformat()}",
            )

        create_data = {
            "tenant_id": coach.tenant_id,
            "coach_id": coach.id,
            "client_id": client.id,
            "training_plan_id": obj_in.training_plan_id,
            "workout_day_id": obj_in.workout_day_id,
            "scheduled_start": obj_in.scheduled_start,
            "scheduled_end": obj_in.scheduled_end,
            "status": SessionStatus.SCHEDULED.value,
            "session_type": session_type,
            "notes": obj_in.notes,
        }
        return self.repository.create(db, obj_in=create_data)

    def get(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        """Fetch session details with tenant and role authorization check."""
        session = self.repository.get_with_details(db, id=id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training session not found",
            )

        self._check_access(session, acting_user)
        return session

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
        session_status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[TrainingSession]:
        """List training sessions scoped strictly by caller role and tenant boundary."""
        if acting_user.role == UserRole.CLIENT.value:
            effective_client_id = acting_user.id
            effective_coach_id = coach_id
            effective_tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.COACH.value:
            effective_coach_id = acting_user.id
            effective_client_id = client_id
            effective_tenant_id = acting_user.tenant_id
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            effective_coach_id = coach_id
            effective_client_id = client_id
            effective_tenant_id = acting_user.tenant_id
        else:  # SUPER_ADMIN
            effective_coach_id = coach_id
            effective_client_id = client_id
            effective_tenant_id = tenant_id

        return self.repository.get_multi_filtered(
            db,
            tenant_id=effective_tenant_id,
            coach_id=effective_coach_id,
            client_id=effective_client_id,
            status=session_status,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )

    def update(
        self,
        db: Session,
        *,
        id: str,
        obj_in: TrainingSessionUpdate,
        acting_user: User,
    ) -> TrainingSession:
        """Update session details, schedule time, or linked training plan/day."""
        session = self.repository.get_with_details(db, id=id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training session not found",
            )

        self._check_mutation_access(session, acting_user)

        # Disallow updates on terminal sessions
        if session.status in TERMINAL_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify session in terminal status '{session.status}'",
            )

        update_data = obj_in.model_dump(exclude_unset=True)

        # Validate time changes if provided
        new_start = update_data.get("scheduled_start", session.scheduled_start)
        new_end = update_data.get("scheduled_end", session.scheduled_end)
        if "scheduled_start" in update_data or "scheduled_end" in update_data:
            if new_end <= new_start:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid time range: scheduled_end must be later than scheduled_start",
                )
            # Check overlap excluding current session
            overlapping = self.repository.check_coach_overlap(
                db,
                coach_id=session.coach_id,
                scheduled_start=new_start,
                scheduled_end=new_end,
                exclude_session_id=session.id,
            )
            if overlapping:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Schedule conflict: Coach already has a session scheduled between "
                           f"{overlapping.scheduled_start.isoformat()} and {overlapping.scheduled_end.isoformat()}",
                )

        # Validate training plan reference if provided
        if "training_plan_id" in update_data and update_data["training_plan_id"]:
            plan = training_plan_repository.get(db, id=update_data["training_plan_id"])
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Training plan with ID '{update_data['training_plan_id']}' not found",
                )
            if plan.tenant_id != session.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training plan reference: plan belongs to a different tenant",
                )
            if plan.coach_id != session.coach_id or plan.client_id != session.client_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid training plan reference: plan does not match this session's coach and client",
                )

            # Validate workout day if provided
            day_id = update_data.get("workout_day_id", session.workout_day_id)
            if day_id:
                day = training_plan_repository.get_day(db, id=day_id)
                if not day or day.training_plan_id != plan.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid workout day reference: day does not belong to selected training plan",
                    )
        elif "workout_day_id" in update_data and update_data["workout_day_id"]:
            # If changing workout_day_id without changing training_plan_id, verify against existing plan
            if not session.training_plan_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot assign workout_day_id without a linked training plan",
                )
            day = training_plan_repository.get_day(db, id=update_data["workout_day_id"])
            if not day or day.training_plan_id != session.training_plan_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid workout day reference: day does not belong to the session's training plan",
                )

        # Validate session type if provided
        if "session_type" in update_data and update_data["session_type"]:
            stype = update_data["session_type"].lower()
            if stype not in [t.value for t in SessionType]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid session type '{stype}'. Valid values: {[t.value for t in SessionType]}",
                )
            update_data["session_type"] = stype

        return self.repository.update(db, db_obj=session, obj_in=update_data)

    # -------------------------------------------------------------------------
    # Status Lifecycle Transitions
    # -------------------------------------------------------------------------

    def transition_status(
        self,
        db: Session,
        *,
        id: str,
        target_status: str,
        acting_user: User,
    ) -> TrainingSession:
        """Safely transition session status according to the domain state machine."""
        session = self.repository.get_with_details(db, id=id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training session not found",
            )

        self._check_mutation_access(session, acting_user)

        target_status_val = target_status.lower()
        if target_status_val not in [s.value for s in SessionStatus]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid target status '{target_status_val}'. Valid values: {[s.value for s in SessionStatus]}",
            )

        current_status = session.status

        # If already in terminal status, forbid transition
        if current_status in TERMINAL_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition session from terminal status '{current_status}'",
            )

        allowed_next = VALID_STATUS_TRANSITIONS.get(current_status, set())
        if target_status_val not in allowed_next:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{current_status}' to '{target_status_val}'. "
                       f"Allowed transitions: {list(allowed_next)}",
            )

        return self.repository.update(db, db_obj=session, obj_in={"status": target_status_val})

    def confirm(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        return self.transition_status(db, id=id, target_status=SessionStatus.CONFIRMED.value, acting_user=acting_user)

    def start(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        return self.transition_status(db, id=id, target_status=SessionStatus.IN_PROGRESS.value, acting_user=acting_user)

    def complete(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        return self.transition_status(db, id=id, target_status=SessionStatus.COMPLETED.value, acting_user=acting_user)

    def cancel(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        return self.transition_status(db, id=id, target_status=SessionStatus.CANCELLED.value, acting_user=acting_user)

    def mark_no_show(self, db: Session, *, id: str, acting_user: User) -> TrainingSession:
        return self.transition_status(db, id=id, target_status=SessionStatus.NO_SHOW.value, acting_user=acting_user)


training_session_service = TrainingSessionService()
