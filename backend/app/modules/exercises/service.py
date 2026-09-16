from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.exercises.models import Exercise, ExerciseVideo
from app.modules.exercises.repository import (
    ExerciseRepository,
    ExerciseVideoRepository,
    exercise_repository,
    exercise_video_repository,
)
from app.modules.exercises.schemas import (
    ExerciseCreate,
    ExerciseDetail,
    ExerciseRead,
    ExerciseUpdate,
    ExerciseVideoCreate,
    ExerciseVideoRead,
    ExerciseVideoUpdate,
)
from app.modules.users.models import User, UserRole


class ExerciseService(BaseService[Exercise, ExerciseRepository]):
    def __init__(
        self,
        repository: ExerciseRepository = exercise_repository,
        video_repository: ExerciseVideoRepository = exercise_video_repository,
    ):
        super().__init__(repository)
        self.video_repo = video_repository

    # --- Authorization Helpers ---

    def _check_read_access(self, exercise: Exercise, user: User) -> None:
        """Check if user is authorized to view this exercise."""
        if user.role == UserRole.SUPER_ADMIN.value:
            return

        # Platform-wide exercises are readable by any authenticated user
        if exercise.tenant_id is None:
            return

        # Gym-specific exercises are only readable by users within that gym
        if exercise.tenant_id != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: cannot access exercises from another gym",
            )

    def _check_write_access(self, exercise: Exercise, user: User) -> None:
        """Check if user has permission to modify or delete this exercise."""
        if user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients have read-only access to the exercise library",
            )

        if user.role == UserRole.SUPER_ADMIN.value:
            return

        # Non-super-admins cannot modify platform-wide library exercises
        if exercise.tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: only Super Admins can modify platform-wide library exercises",
            )

        # Users can only modify exercises within their own tenant
        if exercise.tenant_id != user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: cannot modify exercises belonging to another gym",
            )

    # --- Response Formatting Helpers ---

    @staticmethod
    def _find_primary_video(videos: List[ExerciseVideo]) -> Optional[ExerciseVideoRead]:
        active_videos = [v for v in videos if v.is_active]
        if not active_videos:
            return None
        primary = next((v for v in active_videos if v.is_primary), None)
        chosen = primary or active_videos[0]
        return ExerciseVideoRead.model_validate(chosen)

    def to_read_dto(self, exercise: Exercise) -> ExerciseRead:
        dto = ExerciseRead.model_validate(exercise)
        dto.primary_video = self._find_primary_video(exercise.videos)
        dto.videos_count = len([v for v in exercise.videos if v.is_active])
        return dto

    def to_detail_dto(self, exercise: Exercise) -> ExerciseDetail:
        dto = ExerciseDetail.model_validate(exercise)
        dto.primary_video = self._find_primary_video(exercise.videos)
        dto.videos_count = len([v for v in exercise.videos if v.is_active])
        dto.videos = [ExerciseVideoRead.model_validate(v) for v in exercise.videos if v.is_active]
        return dto

    # --- Exercise Management ---

    def get_by_id(self, db: Session, id: str, acting_user: User) -> Exercise:
        exercise = self.repository.get_with_details(db, id=id)
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise not found",
            )
        self._check_read_access(exercise, acting_user)
        return exercise

    def list_exercises(
        self,
        db: Session,
        *,
        acting_user: User,
        search: Optional[str] = None,
        muscle_group: Optional[str] = None,
        equipment: Optional[str] = None,
        difficulty: Optional[str] = None,
        exercise_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Exercise]:
        """List exercises visible to the acting user."""
        tenant_id = None if acting_user.role == UserRole.SUPER_ADMIN.value else acting_user.tenant_id

        return self.repository.get_multi_visible(
            db,
            tenant_id=tenant_id,
            search=search,
            muscle_group=muscle_group,
            equipment=equipment,
            difficulty=difficulty,
            exercise_type=exercise_type,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    def create(
        self,
        db: Session,
        *,
        obj_in: ExerciseCreate,
        acting_user: User,
    ) -> Exercise:
        """Create a new exercise enforcing tenancy and RBAC."""
        if acting_user.role == UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: clients cannot create exercises",
            )

        target_tenant_id: Optional[str] = None

        if acting_user.role == UserRole.SUPER_ADMIN.value:
            # Super admin can create platform exercise (tenant_id=None) or tenant-specific
            target_tenant_id = obj_in.tenant_id
        else:
            # Gym Admin & Coach can only create for their own tenant
            if obj_in.tenant_id and obj_in.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted: cannot create exercises for another gym",
                )
            target_tenant_id = acting_user.tenant_id

        create_data = {
            "name": obj_in.name,
            "description": obj_in.description,
            "instructions": obj_in.instructions,
            "muscle_group": obj_in.muscle_group,
            "secondary_muscle_group": obj_in.secondary_muscle_group,
            "equipment": obj_in.equipment,
            "difficulty": obj_in.difficulty.value if hasattr(obj_in.difficulty, "value") else obj_in.difficulty,
            "exercise_type": obj_in.exercise_type.value if hasattr(obj_in.exercise_type, "value") else obj_in.exercise_type,
            "tenant_id": target_tenant_id,
            "created_by": acting_user.id,
            "is_active": True,
        }

        exercise = Exercise(**create_data)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)

        # Handle initial videos if provided
        if obj_in.videos:
            for idx, vid_in in enumerate(obj_in.videos):
                is_prim = vid_in.is_primary or (idx == 0)
                vid_data = {
                    "exercise_id": exercise.id,
                    "title": vid_in.title,
                    "description": vid_in.description,
                    "video_url": vid_in.video_url,
                    "thumbnail_url": vid_in.thumbnail_url,
                    "duration_seconds": vid_in.duration_seconds,
                    "is_primary": is_prim,
                    "is_active": True,
                }
                new_vid = ExerciseVideo(**vid_data)
                db.add(new_vid)
            db.commit()
            db.refresh(exercise)

        return self.repository.get_with_details(db, id=exercise.id)

    def update(
        self,
        db: Session,
        *,
        id: str,
        obj_in: ExerciseUpdate,
        acting_user: User,
    ) -> Exercise:
        """Update an exercise enforcing authorization."""
        exercise = self.get_by_id(db, id=id, acting_user=acting_user)
        self._check_write_access(exercise, acting_user)

        update_data = obj_in.model_dump(exclude_unset=True)
        if "difficulty" in update_data and hasattr(update_data["difficulty"], "value"):
            update_data["difficulty"] = update_data["difficulty"].value
        if "exercise_type" in update_data and hasattr(update_data["exercise_type"], "value"):
            update_data["exercise_type"] = update_data["exercise_type"].value

        for field, value in update_data.items():
            setattr(exercise, field, value)

        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return self.repository.get_with_details(db, id=id)

    def delete(
        self,
        db: Session,
        *,
        id: str,
        acting_user: User,
    ) -> Dict[str, Any]:
        """Delete or soft-deactivate an exercise if workout history references it."""
        exercise = self.get_by_id(db, id=id, acting_user=acting_user)
        self._check_write_access(exercise, acting_user)

        ref_count = self.repository.count_workout_references(db, exercise_id=id)
        if ref_count > 0:
            self.repository.deactivate(db, exercise)
            return {
                "action": "deactivated",
                "message": f"Exercise '{exercise.name}' is referenced in {ref_count} historical workout(s). It has been deactivated to preserve workout history.",
                "exercise_id": id,
                "is_active": False,
            }

        db.delete(exercise)
        db.commit()
        return {
            "action": "deleted",
            "message": f"Exercise '{exercise.name}' has been permanently removed.",
            "exercise_id": id,
            "is_active": False,
        }

    # --- Video Management ---

    def add_video(
        self,
        db: Session,
        *,
        exercise_id: str,
        video_in: ExerciseVideoCreate,
        acting_user: User,
    ) -> ExerciseVideo:
        """Add an instructional video to an exercise."""
        exercise = self.get_by_id(db, id=exercise_id, acting_user=acting_user)
        self._check_write_access(exercise, acting_user)

        existing_active_videos = [v for v in exercise.videos if v.is_active]
        is_primary = video_in.is_primary or (len(existing_active_videos) == 0)

        if is_primary:
            self.video_repo.unset_primary_videos(db, exercise_id=exercise_id)

        video_data = {
            "exercise_id": exercise_id,
            "title": video_in.title,
            "description": video_in.description,
            "video_url": video_in.video_url,
            "thumbnail_url": video_in.thumbnail_url,
            "duration_seconds": video_in.duration_seconds,
            "is_primary": is_primary,
            "is_active": True,
        }
        video = ExerciseVideo(**video_data)
        db.add(video)
        db.commit()
        db.refresh(video)
        return video

    def list_videos(
        self,
        db: Session,
        *,
        exercise_id: str,
        acting_user: User,
    ) -> List[ExerciseVideo]:
        """List all active videos for an exercise."""
        exercise = self.get_by_id(db, id=exercise_id, acting_user=acting_user)
        return self.video_repo.get_videos_for_exercise(db, exercise_id=exercise.id, active_only=True)

    def update_video(
        self,
        db: Session,
        *,
        exercise_id: str,
        video_id: str,
        video_in: ExerciseVideoUpdate,
        acting_user: User,
    ) -> ExerciseVideo:
        """Update video details or primary status."""
        exercise = self.get_by_id(db, id=exercise_id, acting_user=acting_user)
        self._check_write_access(exercise, acting_user)

        video = self.video_repo.get_by_exercise_and_id(db, exercise_id=exercise_id, video_id=video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise video not found",
            )

        if video_in.is_primary is True:
            self.video_repo.unset_primary_videos(db, exercise_id=exercise_id, exclude_video_id=video_id)

        update_data = video_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(video, field, value)

        db.add(video)
        db.commit()
        db.refresh(video)
        return video

    def delete_video(
        self,
        db: Session,
        *,
        exercise_id: str,
        video_id: str,
        acting_user: User,
    ) -> None:
        """Delete an exercise video. If it was primary, promote another active video."""
        exercise = self.get_by_id(db, id=exercise_id, acting_user=acting_user)
        self._check_write_access(exercise, acting_user)

        video = self.video_repo.get_by_exercise_and_id(db, exercise_id=exercise_id, video_id=video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise video not found",
            )

        was_primary = video.is_primary
        db.delete(video)
        db.commit()

        # If deleted video was primary, promote another active video if available
        if was_primary:
            remaining_videos = self.video_repo.get_videos_for_exercise(db, exercise_id=exercise_id, active_only=True)
            if remaining_videos:
                remaining_videos[0].is_primary = True
                db.add(remaining_videos[0])
                db.commit()


exercise_service = ExerciseService()
