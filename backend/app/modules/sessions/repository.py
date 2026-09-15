from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, selectinload

from app.common.repositories.base import BaseRepository
from app.modules.sessions.models import TrainingSession, SessionStatus
from app.modules.sessions.schemas import TrainingSessionCreate, TrainingSessionUpdate


class TrainingSessionRepository(
    BaseRepository[TrainingSession, TrainingSessionCreate, TrainingSessionUpdate]
):
    def __init__(self):
        super().__init__(TrainingSession)

    def get_with_details(self, db: Session, id: str) -> Optional[TrainingSession]:
        """Fetch a single training session with coach, client, training_plan, and workout_day eagerly loaded."""
        stmt = (
            select(TrainingSession)
            .options(
                selectinload(TrainingSession.coach),
                selectinload(TrainingSession.client),
                selectinload(TrainingSession.training_plan),
                selectinload(TrainingSession.workout_day),
            )
            .where(TrainingSession.id == id)
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
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TrainingSession]:
        """Fetch multiple sessions filtered by tenant, coach, client, status, or date range."""
        stmt = (
            select(TrainingSession)
            .options(
                selectinload(TrainingSession.coach),
                selectinload(TrainingSession.client),
                selectinload(TrainingSession.training_plan),
                selectinload(TrainingSession.workout_day),
            )
            .order_by(TrainingSession.scheduled_start.asc())
        )

        if tenant_id:
            stmt = stmt.where(TrainingSession.tenant_id == tenant_id)
        if coach_id:
            stmt = stmt.where(TrainingSession.coach_id == coach_id)
        if client_id:
            stmt = stmt.where(TrainingSession.client_id == client_id)
        if status:
            stmt = stmt.where(TrainingSession.status == status)
        if date_from:
            stmt = stmt.where(TrainingSession.scheduled_start >= date_from)
        if date_to:
            stmt = stmt.where(TrainingSession.scheduled_end <= date_to)

        stmt = stmt.offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def check_coach_overlap(
        self,
        db: Session,
        *,
        coach_id: str,
        scheduled_start: datetime,
        scheduled_end: datetime,
        exclude_session_id: Optional[str] = None,
    ) -> Optional[TrainingSession]:
        """
        Check if a coach already has a non-cancelled session overlapping the requested time window.
        Overlap condition: existing.scheduled_start < new_end AND existing.scheduled_end > new_start.
        """
        stmt = (
            select(TrainingSession)
            .where(
                and_(
                    TrainingSession.coach_id == coach_id,
                    TrainingSession.status != SessionStatus.CANCELLED.value,
                    TrainingSession.scheduled_start < scheduled_end,
                    TrainingSession.scheduled_end > scheduled_start,
                )
            )
        )
        if exclude_session_id:
            stmt = stmt.where(TrainingSession.id != exclude_session_id)

        return db.execute(stmt).scalars().first()


training_session_repository = TrainingSessionRepository()
