from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.assignments.repository import assignment_repository
from app.modules.training_plans.models import (
    PlanStatus,
    TrainingPlan,
    WorkoutDay,
    WorkoutExercise,
)
from app.modules.training_plans.repository import (
    TrainingPlanRepository,
    training_plan_repository,
)
from app.modules.training_plans.schemas import (
    TrainingPlanCreate,
    TrainingPlanUpdate,
    WorkoutDayCreate,
    WorkoutDayUpdate,
    WorkoutExerciseCreate,
    WorkoutExerciseUpdate,
)
from app.modules.users.models import User, UserRole
from app.modules.users.repository import user_repository


class TrainingPlanService(BaseService[TrainingPlan, TrainingPlanRepository]):
    def __init__(self, repository: TrainingPlanRepository = training_plan_repository):
        super().__init__(repository)

    def create(
        self,
        db: Session,
        *,
        obj_in: TrainingPlanCreate,
        acting_user: User,
    ) -> TrainingPlan:
        """Create a training plan enforcing RBAC, multi-tenancy, and active assignment invariant."""
        # 1. Role-based permission check: Clients cannot create plans
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot create training plans",
            )

        # 2. Determine and validate coach ID
        effective_coach_id = obj_in.coach_id
        if acting_user.role == UserRole.COACH.value:
            if effective_coach_id and effective_coach_id != acting_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: coaches can only create training plans for themselves",
                )
            effective_coach_id = acting_user.id
        elif not effective_coach_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="coach_id is required when creating a training plan as administrator",
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
                detail=f"Coach '{coach.email}' is inactive and cannot create plans",
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
                detail=f"Client '{client.email}' is inactive and cannot be assigned a plan",
            )

        # 5. Validate same-tenant invariant
        if coach.tenant_id != client.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-tenant plan rejected: coach and client must belong to the same gym tenant",
            )

        # 6. Validate gym_admin boundary
        if acting_user.role == UserRole.GYM_ADMIN.value:
            if coach.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant plan forbidden: you may only create plans for your own gym",
                )

        # 7. CRITICAL: Validate active Coach-Client Assignment exists
        assignment = assignment_repository.get_active_assignment(
            db, coach_id=coach.id, client_id=client.id
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active coach-client assignment required: coach must be actively assigned to this client",
            )

        # 8. Validate status
        status_value = (obj_in.status or PlanStatus.DRAFT.value).lower()
        if status_value not in [s.value for s in PlanStatus]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan status '{status_value}'. Valid values: {[s.value for s in PlanStatus]}",
            )

        create_data = {
            "tenant_id": coach.tenant_id,
            "coach_id": coach.id,
            "client_id": client.id,
            "name": obj_in.name,
            "description": obj_in.description,
            "status": status_value,
            "start_date": obj_in.start_date,
            "end_date": obj_in.end_date,
        }
        return self.repository.create(db, obj_in=create_data)

    def get(self, db: Session, *, id: str, acting_user: User) -> TrainingPlan:
        """Fetch plan details with tenant and role authorization check."""
        plan = self.repository.get_with_details(db, id=id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training plan not found",
            )

        self._check_access(plan, acting_user)
        return plan

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
        plan_status: Optional[str] = None,
    ) -> List[TrainingPlan]:
        """List training plans scoped strictly by caller role and tenant boundary."""
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
            status=plan_status,
            skip=skip,
            limit=limit,
        )

    def update(
        self,
        db: Session,
        *,
        id: str,
        obj_in: TrainingPlanUpdate,
        acting_user: User,
    ) -> TrainingPlan:
        """Update a plan ensuring caller has modification rights."""
        plan = self.repository.get_with_details(db, id=id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training plan not found",
            )

        self._check_modification_access(plan, acting_user)

        update_data = obj_in.model_dump(exclude_unset=True)
        if "status" in update_data and update_data["status"]:
            status_value = update_data["status"].lower()
            if status_value not in [s.value for s in PlanStatus]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid plan status '{status_value}'. Valid values: {[s.value for s in PlanStatus]}",
                )
            update_data["status"] = status_value

        return self.repository.update(db, db_obj=plan, obj_in=update_data)

    def archive(self, db: Session, *, id: str, acting_user: User) -> TrainingPlan:
        """Archive a training plan."""
        return self.update(
            db,
            id=id,
            obj_in=TrainingPlanUpdate(status=PlanStatus.ARCHIVED.value),
            acting_user=acting_user,
        )

    # --- Workout Day Sub-Resource Management ---

    def add_workout_day(
        self,
        db: Session,
        *,
        plan_id: str,
        day_in: WorkoutDayCreate,
        acting_user: User,
    ) -> WorkoutDay:
        """Add a workout day/session to an existing training plan."""
        plan = self.repository.get(db, id=plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training plan not found",
            )
        self._check_modification_access(plan, acting_user)

        data = {
            "training_plan_id": plan.id,
            "tenant_id": plan.tenant_id,
            "name": day_in.name,
            "description": day_in.description,
            "day_number": day_in.day_number,
            "order_index": day_in.order_index,
        }
        return self.repository.create_day(db, obj_in=data)

    def update_workout_day(
        self,
        db: Session,
        *,
        day_id: str,
        day_in: WorkoutDayUpdate,
        acting_user: User,
    ) -> WorkoutDay:
        day = self.repository.get_day(db, id=day_id)
        if not day:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout day not found",
            )
        plan = self.repository.get(db, id=day.training_plan_id)
        self._check_modification_access(plan, acting_user)

        return self.repository.update_day(db, db_obj=day, obj_in=day_in)

    def delete_workout_day(
        self,
        db: Session,
        *,
        day_id: str,
        acting_user: User,
    ) -> WorkoutDay:
        day = self.repository.get_day(db, id=day_id)
        if not day:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout day not found",
            )
        plan = self.repository.get(db, id=day.training_plan_id)
        self._check_modification_access(plan, acting_user)

        return self.repository.delete_day(db, db_obj=day)

    # --- Workout Exercise Sub-Resource Management ---

    def add_exercise(
        self,
        db: Session,
        *,
        day_id: str,
        exercise_in: WorkoutExerciseCreate,
        acting_user: User,
    ) -> WorkoutExercise:
        day = self.repository.get_day(db, id=day_id)
        if not day:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout day not found",
            )
        plan = self.repository.get(db, id=day.training_plan_id)
        self._check_modification_access(plan, acting_user)

        data = {
            "workout_day_id": day.id,
            "tenant_id": day.tenant_id,
            "exercise_name": exercise_in.exercise_name,
            "description": exercise_in.description,
            "sets": exercise_in.sets,
            "repetitions": exercise_in.repetitions,
            "duration_seconds": exercise_in.duration_seconds,
            "rest_seconds": exercise_in.rest_seconds,
            "notes": exercise_in.notes,
            "order_index": exercise_in.order_index,
        }
        return self.repository.create_exercise(db, obj_in=data)

    def update_exercise(
        self,
        db: Session,
        *,
        exercise_id: str,
        exercise_in: WorkoutExerciseUpdate,
        acting_user: User,
    ) -> WorkoutExercise:
        exercise = self.repository.get_exercise(db, id=exercise_id)
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout exercise not found",
            )
        day = self.repository.get_day(db, id=exercise.workout_day_id)
        plan = self.repository.get(db, id=day.training_plan_id)
        self._check_modification_access(plan, acting_user)

        return self.repository.update_exercise(db, db_obj=exercise, obj_in=exercise_in)

    def delete_exercise(
        self,
        db: Session,
        *,
        exercise_id: str,
        acting_user: User,
    ) -> WorkoutExercise:
        exercise = self.repository.get_exercise(db, id=exercise_id)
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout exercise not found",
            )
        day = self.repository.get_day(db, id=exercise.workout_day_id)
        plan = self.repository.get(db, id=day.training_plan_id)
        self._check_modification_access(plan, acting_user)

        return self.repository.delete_exercise(db, db_obj=exercise)

    # --- Internal Authorization Helpers ---

    def _check_access(self, plan: TrainingPlan, user: User) -> None:
        """Check if user has permission to view this training plan."""
        if user.role == UserRole.SUPER_ADMIN.value:
            return
        if user.role == UserRole.GYM_ADMIN.value:
            if plan.tenant_id != user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access forbidden",
                )
            return
        if user.role == UserRole.COACH.value:
            if plan.tenant_id != user.tenant_id or plan.coach_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: you can only view your own training plans",
                )
            return
        if user.role == UserRole.CLIENT.value:
            if plan.tenant_id != user.tenant_id or plan.client_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: you can only view your own training plans",
                )
            return

    def _check_modification_access(self, plan: TrainingPlan, user: User) -> None:
        """Check if user has permission to mutate (edit/delete) this plan or its workouts."""
        if user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot modify training plans or workouts",
            )
        if user.role == UserRole.SUPER_ADMIN.value:
            return
        if user.role == UserRole.GYM_ADMIN.value:
            if plan.tenant_id != user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant modification forbidden: you may only modify plans in your own gym",
                )
            return
        if user.role == UserRole.COACH.value:
            if plan.tenant_id != user.tenant_id or plan.coach_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: you can only modify your own training plans",
                )
            return


training_plan_service = TrainingPlanService()
