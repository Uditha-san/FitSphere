import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    ForeignKey,
    DateTime,
    Numeric,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant
    from app.modules.users.models import User
    from app.modules.training_plans.models import TrainingPlan
    from app.modules.sessions.models import TrainingSession


class ProgressRecord(Base, TimestampMixin):
    """Represents a client progress tracking record logged by a coach within a gym tenant."""
    __tablename__ = "progress_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    coach_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False
    )
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    body_fat_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    chest_cm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    waist_cm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    hip_cm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    arm_cm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    thigh_cm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    training_session_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("training_sessions.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )
    training_plan_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("training_plans.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    coach: Mapped["User"] = relationship("User", foreign_keys=[coach_id])
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])
    training_session: Mapped[Optional["TrainingSession"]] = relationship(
        "TrainingSession", foreign_keys=[training_session_id]
    )
    training_plan: Mapped[Optional["TrainingPlan"]] = relationship(
        "TrainingPlan", foreign_keys=[training_plan_id]
    )

    __table_args__ = (
        Index("ix_progress_records_tenant_client", "tenant_id", "client_id"),
        Index("ix_progress_records_client_recorded_at", "client_id", "recorded_at"),
        Index("ix_progress_records_tenant_coach", "tenant_id", "coach_id"),
    )
