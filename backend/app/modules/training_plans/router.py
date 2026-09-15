from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.modules.training_plans.schemas import (
    TrainingPlanCreate,
    TrainingPlanRead,
    TrainingPlanSummary,
    TrainingPlanUpdate,
    WorkoutDayCreate,
    WorkoutDayRead,
    WorkoutDayUpdate,
    WorkoutExerciseCreate,
    WorkoutExerciseRead,
    WorkoutExerciseUpdate,
)
from app.modules.training_plans.service import training_plan_service
from app.modules.users.models import User

router = APIRouter()


# --- Training Plan Endpoints ---

@router.post(
    "/",
    response_model=TrainingPlanRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Training Plan",
    description="Create a new training plan for an assigned client within the gym. "
                "Coaches can create for their assigned clients; admins can create within gym.",
)
def create_training_plan(
    plan_in: TrainingPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.create(db, obj_in=plan_in, acting_user=current_user)


@router.get(
    "/",
    response_model=List[TrainingPlanSummary],
    summary="List Training Plans",
    description="List training plans scoped by caller role and tenant boundary. "
                "Coaches view their own plans; clients view their assigned plans; "
                "gym_admin views plans inside their gym; super_admin can view all.",
)
def list_training_plans(
    skip: int = 0,
    limit: int = 100,
    coach_id: Optional[str] = Query(None, description="Filter by coach UUID"),
    client_id: Optional[str] = Query(None, description="Filter by client UUID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant UUID (super_admin only)"),
    status: Optional[str] = Query(None, description="Filter by status (draft, active, completed, archived)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    plans = training_plan_service.get_multi(
        db,
        acting_user=current_user,
        skip=skip,
        limit=limit,
        coach_id=coach_id,
        client_id=client_id,
        tenant_id=tenant_id,
        plan_status=status,
    )
    # Format summary with days_count
    summaries = []
    for p in plans:
        summary_dict = {
            "id": p.id,
            "tenant_id": p.tenant_id,
            "coach_id": p.coach_id,
            "client_id": p.client_id,
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "coach": p.coach,
            "client": p.client,
            "days_count": len(p.workout_days) if p.workout_days else 0,
        }
        summaries.append(TrainingPlanSummary(**summary_dict))
    return summaries


@router.get(
    "/{id}",
    response_model=TrainingPlanRead,
    summary="Get Training Plan Details",
    description="Fetch a single training plan with all workout days and exercises eagerly loaded.",
)
def get_training_plan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.get(db, id=id, acting_user=current_user)


@router.patch(
    "/{id}",
    response_model=TrainingPlanRead,
    summary="Update Training Plan",
    description="Update plan name, description, status, or start/end dates.",
)
def update_training_plan(
    id: str,
    plan_in: TrainingPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.update(db, id=id, obj_in=plan_in, acting_user=current_user)


@router.post(
    "/{id}/archive",
    response_model=TrainingPlanRead,
    summary="Archive Training Plan",
    description="Mark a training plan as archived.",
)
def archive_training_plan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.archive(db, id=id, acting_user=current_user)


# --- Workout Day Endpoints ---

@router.post(
    "/{id}/days",
    response_model=WorkoutDayRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add Workout Day to Plan",
    description="Add a new workout session/day to an existing training plan.",
)
def add_workout_day(
    id: str,
    day_in: WorkoutDayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.add_workout_day(
        db, plan_id=id, day_in=day_in, acting_user=current_user
    )


@router.put(
    "/days/{day_id}",
    response_model=WorkoutDayRead,
    summary="Update Workout Day",
    description="Update workout day name, description, day number, or order index.",
)
def update_workout_day(
    day_id: str,
    day_in: WorkoutDayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.update_workout_day(
        db, day_id=day_id, day_in=day_in, acting_user=current_user
    )


@router.delete(
    "/days/{day_id}",
    response_model=WorkoutDayRead,
    summary="Delete Workout Day",
    description="Remove a workout day and all its nested exercises.",
)
def delete_workout_day(
    day_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.delete_workout_day(
        db, day_id=day_id, acting_user=current_user
    )


# --- Workout Exercise Endpoints ---

@router.post(
    "/days/{day_id}/exercises",
    response_model=WorkoutExerciseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add Exercise to Workout Day",
    description="Add an exercise/item (sets, reps, rest, notes) to a workout day.",
)
def add_exercise(
    day_id: str,
    exercise_in: WorkoutExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.add_exercise(
        db, day_id=day_id, exercise_in=exercise_in, acting_user=current_user
    )


@router.put(
    "/exercises/{exercise_id}",
    response_model=WorkoutExerciseRead,
    summary="Update Exercise",
    description="Update exercise sets, reps, rest, notes, or order index.",
)
def update_exercise(
    exercise_id: str,
    exercise_in: WorkoutExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.update_exercise(
        db, exercise_id=exercise_id, exercise_in=exercise_in, acting_user=current_user
    )


@router.delete(
    "/exercises/{exercise_id}",
    response_model=WorkoutExerciseRead,
    summary="Delete Exercise",
    description="Remove an exercise from a workout day.",
)
def delete_exercise(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_plan_service.delete_exercise(
        db, exercise_id=exercise_id, acting_user=current_user
    )
