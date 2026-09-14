from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.repositories.base import BaseRepository
from app.modules.assignments.models import CoachClientAssignment
from app.modules.assignments.schemas import (
    CoachClientAssignmentCreate,
    CoachClientAssignmentUpdate,
)


class CoachClientAssignmentRepository(
    BaseRepository[
        CoachClientAssignment,
        CoachClientAssignmentCreate,
        CoachClientAssignmentUpdate,
    ]
):
    def __init__(self):
        super().__init__(CoachClientAssignment)

    def get_active_assignment(
        self,
        db: Session,
        *,
        coach_id: str,
        client_id: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[CoachClientAssignment]:
        """Fetch active assignment between a coach and a client."""
        stmt = select(self.model).where(
            self.model.coach_id == coach_id,
            self.model.client_id == client_id,
            self.model.is_active.is_(True),
        )
        if tenant_id:
            stmt = stmt.where(self.model.tenant_id == tenant_id)
        return db.scalars(stmt).first()

    def get_multi_filtered(
        self,
        db: Session,
        *,
        tenant_id: Optional[str] = None,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CoachClientAssignment]:
        """Fetch assignments with multi-dimensional filtering."""
        stmt = select(self.model)
        if tenant_id:
            stmt = stmt.where(self.model.tenant_id == tenant_id)
        if coach_id:
            stmt = stmt.where(self.model.coach_id == coach_id)
        if client_id:
            stmt = stmt.where(self.model.client_id == client_id)
        if is_active is not None:
            stmt = stmt.where(self.model.is_active == is_active)

        stmt = stmt.order_by(self.model.created_at.desc()).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())


assignment_repository = CoachClientAssignmentRepository()
