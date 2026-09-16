from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, selectinload

from app.common.repositories.base import BaseRepository
from app.modules.progress.models import ProgressRecord
from app.modules.progress.schemas import ProgressRecordCreate, ProgressRecordUpdate, ProgressLatestSummary, ProgressRecordRead


class ProgressRecordRepository(
    BaseRepository[ProgressRecord, ProgressRecordCreate, ProgressRecordUpdate]
):
    def __init__(self):
        super().__init__(ProgressRecord)

    def get_with_details(self, db: Session, id: str) -> Optional[ProgressRecord]:
        """Fetch a single progress record with client, coach, training_session, and training_plan eagerly loaded."""
        stmt = (
            select(ProgressRecord)
            .options(
                selectinload(ProgressRecord.client),
                selectinload(ProgressRecord.coach),
                selectinload(ProgressRecord.training_session),
                selectinload(ProgressRecord.training_plan),
            )
            .where(ProgressRecord.id == id)
        )
        return db.execute(stmt).scalars().first()

    def get_multi_filtered(
        self,
        db: Session,
        *,
        tenant_id: Optional[str] = None,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ProgressRecord]:
        """Fetch progress records filtered by tenant, coach, client, or date range."""
        stmt = (
            select(ProgressRecord)
            .options(
                selectinload(ProgressRecord.client),
                selectinload(ProgressRecord.coach),
                selectinload(ProgressRecord.training_session),
                selectinload(ProgressRecord.training_plan),
            )
            .order_by(ProgressRecord.recorded_at.desc())
        )

        if tenant_id:
            stmt = stmt.where(ProgressRecord.tenant_id == tenant_id)
        if coach_id:
            stmt = stmt.where(ProgressRecord.coach_id == coach_id)
        if client_id:
            stmt = stmt.where(ProgressRecord.client_id == client_id)
        if date_from:
            stmt = stmt.where(ProgressRecord.recorded_at >= date_from)
        if date_to:
            stmt = stmt.where(ProgressRecord.recorded_at <= date_to)

        stmt = stmt.offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def get_client_history(
        self,
        db: Session,
        *,
        client_id: str,
        tenant_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ProgressRecord]:
        """Fetch client progress records in descending order of recorded_at."""
        stmt = (
            select(ProgressRecord)
            .options(
                selectinload(ProgressRecord.client),
                selectinload(ProgressRecord.coach),
                selectinload(ProgressRecord.training_session),
                selectinload(ProgressRecord.training_plan),
            )
            .where(ProgressRecord.client_id == client_id)
            .order_by(ProgressRecord.recorded_at.desc())
        )

        if tenant_id:
            stmt = stmt.where(ProgressRecord.tenant_id == tenant_id)
        if date_from:
            stmt = stmt.where(ProgressRecord.recorded_at >= date_from)
        if date_to:
            stmt = stmt.where(ProgressRecord.recorded_at <= date_to)

        stmt = stmt.offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def get_latest_for_client(
        self,
        db: Session,
        *,
        client_id: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[ProgressRecord]:
        """Fetch the most recent progress record for a client."""
        stmt = (
            select(ProgressRecord)
            .options(
                selectinload(ProgressRecord.client),
                selectinload(ProgressRecord.coach),
                selectinload(ProgressRecord.training_session),
                selectinload(ProgressRecord.training_plan),
            )
            .where(ProgressRecord.client_id == client_id)
            .order_by(ProgressRecord.recorded_at.desc())
        )
        if tenant_id:
            stmt = stmt.where(ProgressRecord.tenant_id == tenant_id)

        return db.execute(stmt).scalars().first()

    def get_client_summary_stats(
        self,
        db: Session,
        *,
        client_id: str,
        tenant_id: Optional[str] = None,
    ) -> ProgressLatestSummary:
        """Calculate latest record, count, first record, and overall metric changes."""
        filter_conds = [ProgressRecord.client_id == client_id]
        if tenant_id:
            filter_conds.append(ProgressRecord.tenant_id == tenant_id)

        # Count total
        count_stmt = select(func.count()).select_from(ProgressRecord).where(and_(*filter_conds))
        total_records = db.execute(count_stmt).scalar() or 0

        if total_records == 0:
            return ProgressLatestSummary(
                client_id=client_id,
                latest_record=None,
                total_records=0,
                first_recorded_at=None,
                last_recorded_at=None,
                weight_change_kg=None,
                body_fat_change_percentage=None,
            )

        # Get latest
        latest_stmt = (
            select(ProgressRecord)
            .options(
                selectinload(ProgressRecord.client),
                selectinload(ProgressRecord.coach),
                selectinload(ProgressRecord.training_session),
                selectinload(ProgressRecord.training_plan),
            )
            .where(and_(*filter_conds))
            .order_by(ProgressRecord.recorded_at.desc())
            .limit(1)
        )
        latest_record = db.execute(latest_stmt).scalars().first()

        # Get oldest
        oldest_stmt = (
            select(ProgressRecord)
            .where(and_(*filter_conds))
            .order_by(ProgressRecord.recorded_at.asc())
            .limit(1)
        )
        oldest_record = db.execute(oldest_stmt).scalars().first()

        weight_change: Optional[Decimal] = None
        if latest_record and oldest_record and latest_record.weight_kg is not None and oldest_record.weight_kg is not None:
            weight_change = latest_record.weight_kg - oldest_record.weight_kg

        body_fat_change: Optional[Decimal] = None
        if (
            latest_record
            and oldest_record
            and latest_record.body_fat_percentage is not None
            and oldest_record.body_fat_percentage is not None
        ):
            body_fat_change = latest_record.body_fat_percentage - oldest_record.body_fat_percentage

        return ProgressLatestSummary(
            client_id=client_id,
            latest_record=ProgressRecordRead.model_validate(latest_record) if latest_record else None,
            total_records=total_records,
            first_recorded_at=oldest_record.recorded_at if oldest_record else None,
            last_recorded_at=latest_record.recorded_at if latest_record else None,
            weight_change_kg=weight_change,
            body_fat_change_percentage=body_fat_change,
        )


progress_repository = ProgressRecordRepository()
