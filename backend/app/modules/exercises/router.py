from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_coach
from app.db.session import get_db
from app.modules.exercises.schemas import (
    ExerciseCreate,
    ExerciseDetail,
    ExerciseRead,
    ExerciseUpdate,
    ExerciseVideoCreate,
    ExerciseVideoRead,
    ExerciseVideoUpdate,
)
from app.modules.exercises.service import exercise_service
from app.modules.users.models import User

router = APIRouter()


# --- Exercise Endpoints ---

@router.post(
    "/",
    response_model=ExerciseDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create Exercise",
    description="Create a new library exercise. Coaches and Gym Admins create exercises for their own gym. "
                "Super Admins can create platform-wide exercises (tenant_id=None) or gym-specific exercises.",
)
def create_exercise(
    exercise_in: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    exercise = exercise_service.create(db, obj_in=exercise_in, acting_user=current_user)
    return exercise_service.to_detail_dto(exercise)


@router.get(
    "/",
    response_model=List[ExerciseRead],
    summary="List Exercises",
    description="List exercises visible to the current user (platform library + tenant-specific exercises). "
                "Supports filtering by search text, muscle group, equipment, difficulty, and type.",
)
def list_exercises(
    search: Optional[str] = Query(None, description="Search by name, description, or muscle group"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    exercise_type: Optional[str] = Query(None, description="Filter by exercise type"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    exercises = exercise_service.list_exercises(
        db,
        acting_user=current_user,
        search=search,
        muscle_group=muscle_group,
        equipment=equipment,
        difficulty=difficulty,
        exercise_type=exercise_type,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    return [exercise_service.to_read_dto(e) for e in exercises]


@router.get(
    "/{exercise_id}",
    response_model=ExerciseDetail,
    summary="Get Exercise Details",
    description="Retrieve exercise details including instructions, full video gallery, and creator metadata.",
)
def get_exercise(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    exercise = exercise_service.get_by_id(db, id=exercise_id, acting_user=current_user)
    return exercise_service.to_detail_dto(exercise)


@router.patch(
    "/{exercise_id}",
    response_model=ExerciseDetail,
    summary="Update Exercise",
    description="Update an exercise. Non-super admins can only update exercises belonging to their gym.",
)
def update_exercise(
    exercise_id: str,
    exercise_in: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    exercise = exercise_service.update(db, id=exercise_id, obj_in=exercise_in, acting_user=current_user)
    return exercise_service.to_detail_dto(exercise)


@router.delete(
    "/{exercise_id}",
    response_model=Dict[str, Any],
    summary="Delete or Deactivate Exercise",
    description="Deletes an exercise. If the exercise is referenced by historical workouts, it is safely soft-deactivated (is_active=false).",
)
def delete_exercise(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return exercise_service.delete(db, id=exercise_id, acting_user=current_user)


# --- Video Endpoints ---

@router.post(
    "/{exercise_id}/videos",
    response_model=ExerciseVideoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add Exercise Video",
    description="Attach an instructional technique video to an exercise.",
)
def add_exercise_video(
    exercise_id: str,
    video_in: ExerciseVideoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return exercise_service.add_video(
        db,
        exercise_id=exercise_id,
        video_in=video_in,
        acting_user=current_user,
    )


@router.get(
    "/{exercise_id}/videos",
    response_model=List[ExerciseVideoRead],
    summary="List Exercise Videos",
    description="Retrieve all tutorial videos for an exercise.",
)
def list_exercise_videos(
    exercise_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return exercise_service.list_videos(
        db,
        exercise_id=exercise_id,
        acting_user=current_user,
    )


@router.patch(
    "/{exercise_id}/videos/{video_id}",
    response_model=ExerciseVideoRead,
    summary="Update Exercise Video",
    description="Update a video's metadata or set it as the primary technique demonstration.",
)
def update_exercise_video(
    exercise_id: str,
    video_id: str,
    video_in: ExerciseVideoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return exercise_service.update_video(
        db,
        exercise_id=exercise_id,
        video_id=video_id,
        video_in=video_in,
        acting_user=current_user,
    )


@router.delete(
    "/{exercise_id}/videos/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Exercise Video",
    description="Remove a tutorial video from an exercise.",
)
def delete_exercise_video(
    exercise_id: str,
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    exercise_service.delete_video(
        db,
        exercise_id=exercise_id,
        video_id=video_id,
        acting_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
