from typing import Any, Dict, List, Optional, Union
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.repositories.base import BaseRepository
from app.modules.training_plans.models import (
    TrainingPlan,
    WorkoutDay,
    WorkoutExercise,
)
from app.modules.training_plans.schemas import (
    TrainingPlanCreate,
    TrainingPlanUpdate,
)


class TrainingPlanRepository(
    BaseRepository[TrainingPlan, TrainingPlanCreate, TrainingPlanUpdate]
):
    def __init__(self):
        super().__init__(TrainingPlan)

    def get_with_details(self, db: Session, id: str) -> Optional[TrainingPlan]:
        """Fetch a single training plan with coach, client, workout days and exercises eagerly loaded."""
        stmt = (
            select(TrainingPlan)
            .options(
                selectinload(TrainingPlan.coach),
                selectinload(TrainingPlan.client),
                selectinload(TrainingPlan.workout_days).selectinload(WorkoutDay.exercises),
            )
            .where(TrainingPlan.id == id)
        )
        return db.execute(stmt).scalars().first()

    def get_multi_filtered(
        self,
        db: Session,
        *,
        tenant_id: Optional[str] = None,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TrainingPlan]:
        """Fetch multiple plans filtered by tenant, coach, client, or lifecycle status."""
        stmt = (
            select(TrainingPlan)
            .options(
                selectinload(TrainingPlan.coach),
                selectinload(TrainingPlan.client),
                selectinload(TrainingPlan.workout_days),
            )
            .order_by(TrainingPlan.created_at.desc())
        )

        if tenant_id:
            stmt = stmt.where(TrainingPlan.tenant_id == tenant_id)
        if coach_id:
            stmt = stmt.where(TrainingPlan.coach_id == coach_id)
        if client_id:
            stmt = stmt.where(TrainingPlan.client_id == client_id)
        if status:
            stmt = stmt.where(TrainingPlan.status == status)

        stmt = stmt.offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    # --- Workout Day Operations ---

    def get_day(self, db: Session, id: str) -> Optional[WorkoutDay]:
        stmt = (
            select(WorkoutDay)
            .options(selectinload(WorkoutDay.exercises))
            .where(WorkoutDay.id == id)
        )
        return db.execute(stmt).scalars().first()

    def create_day(self, db: Session, *, obj_in: Dict[str, Any]) -> WorkoutDay:
        day = WorkoutDay(**obj_in)
        db.add(day)
        db.commit()
        db.refresh(day)
        return day

    def update_day(
        self,
        db: Session,
        *,
        db_obj: WorkoutDay,
        obj_in: Union[Dict[str, Any], Any]
    ) -> WorkoutDay:
        update_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete_day(self, db: Session, *, db_obj: WorkoutDay) -> WorkoutDay:
        db.delete(db_obj)
        db.commit()
        return db_obj

    # --- Workout Exercise Operations ---

    def get_exercise(self, db: Session, id: str) -> Optional[WorkoutExercise]:
        stmt = select(WorkoutExercise).where(WorkoutExercise.id == id)
        return db.execute(stmt).scalars().first()

    def create_exercise(self, db: Session, *, obj_in: Dict[str, Any]) -> WorkoutExercise:
        exercise = WorkoutExercise(**obj_in)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return exercise

    def update_exercise(
        self,
        db: Session,
        *,
        db_obj: WorkoutExercise,
        obj_in: Union[Dict[str, Any], Any]
    ) -> WorkoutExercise:
        update_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete_exercise(self, db: Session, *, db_obj: WorkoutExercise) -> WorkoutExercise:
        db.delete(db_obj)
        db.commit()
        return db_obj


training_plan_repository = TrainingPlanRepository()
