from typing import List, Optional
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import Session, selectinload

from app.common.repositories.base import BaseRepository
from app.modules.exercises.models import Exercise, ExerciseVideo
from app.modules.exercises.schemas import ExerciseCreate, ExerciseUpdate, ExerciseVideoCreate, ExerciseVideoUpdate
from app.modules.training_plans.models import WorkoutExercise


class ExerciseRepository(BaseRepository[Exercise, ExerciseCreate, ExerciseUpdate]):
    def __init__(self):
        super().__init__(Exercise)

    def get_with_details(self, db: Session, id: str) -> Optional[Exercise]:
        """Fetch exercise by ID eagerly loading creator and videos."""
        stmt = (
            select(Exercise)
            .options(
                selectinload(Exercise.creator),
                selectinload(Exercise.videos),
            )
            .where(Exercise.id == id)
        )
        return db.execute(stmt).scalars().first()

    def get_multi_visible(
        self,
        db: Session,
        *,
        tenant_id: Optional[str] = None,
        search: Optional[str] = None,
        muscle_group: Optional[str] = None,
        equipment: Optional[str] = None,
        difficulty: Optional[str] = None,
        exercise_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Exercise]:
        """Fetch exercises visible to the given tenant (or all for super admin).
        
        If tenant_id is provided, includes both platform-wide (tenant_id IS NULL)
        and gym-specific (Exercise.tenant_id == tenant_id) exercises.
        """
        stmt = (
            select(Exercise)
            .options(
                selectinload(Exercise.creator),
                selectinload(Exercise.videos),
            )
            .order_by(Exercise.name.asc())
        )

        conditions = []

        if tenant_id is not None:
            # Tenant can see their own custom exercises PLUS global platform exercises
            conditions.append(or_(Exercise.tenant_id == tenant_id, Exercise.tenant_id.is_(None)))

        if is_active is not None:
            conditions.append(Exercise.is_active == is_active)

        if search:
            search_filter = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Exercise.name.ilike(search_filter),
                    Exercise.description.ilike(search_filter),
                    Exercise.muscle_group.ilike(search_filter),
                )
            )

        if muscle_group:
            conditions.append(Exercise.muscle_group.ilike(f"%{muscle_group.strip()}%"))

        if equipment:
            conditions.append(Exercise.equipment.ilike(f"%{equipment.strip()}%"))

        if difficulty:
            conditions.append(Exercise.difficulty == difficulty.strip().lower())

        if exercise_type:
            conditions.append(Exercise.exercise_type == exercise_type.strip().lower())

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def count_workout_references(self, db: Session, exercise_id: str) -> int:
        """Count how many historical workout items reference this exercise."""
        stmt = select(func.count(WorkoutExercise.id)).where(WorkoutExercise.exercise_id == exercise_id)
        return db.scalar(stmt) or 0

    def deactivate(self, db: Session, exercise: Exercise) -> Exercise:
        """Soft-deactivate an exercise when referenced by historical workouts."""
        exercise.is_active = False
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return exercise


class ExerciseVideoRepository(BaseRepository[ExerciseVideo, ExerciseVideoCreate, ExerciseVideoUpdate]):
    def __init__(self):
        super().__init__(ExerciseVideo)

    def get_by_exercise_and_id(self, db: Session, exercise_id: str, video_id: str) -> Optional[ExerciseVideo]:
        """Fetch a video by ID specifically for the given exercise."""
        stmt = select(ExerciseVideo).where(
            and_(ExerciseVideo.exercise_id == exercise_id, ExerciseVideo.id == video_id)
        )
        return db.execute(stmt).scalars().first()

    def get_videos_for_exercise(
        self, db: Session, exercise_id: str, active_only: bool = True
    ) -> List[ExerciseVideo]:
        """Fetch all videos belonging to an exercise ordered with primary first."""
        stmt = (
            select(ExerciseVideo)
            .where(ExerciseVideo.exercise_id == exercise_id)
            .order_by(ExerciseVideo.is_primary.desc(), ExerciseVideo.created_at.asc())
        )
        if active_only:
            stmt = stmt.where(ExerciseVideo.is_active == True)
        return list(db.execute(stmt).scalars().all())

    def unset_primary_videos(
        self, db: Session, exercise_id: str, exclude_video_id: Optional[str] = None
    ) -> None:
        """Ensure only one primary video exists for this exercise by unsetting other primaries."""
        stmt = (
            update(ExerciseVideo)
            .where(ExerciseVideo.exercise_id == exercise_id)
            .values(is_primary=False)
        )
        if exclude_video_id:
            stmt = stmt.where(ExerciseVideo.id != exclude_video_id)
        db.execute(stmt)
        db.commit()


exercise_repository = ExerciseRepository()
exercise_video_repository = ExerciseVideoRepository()
