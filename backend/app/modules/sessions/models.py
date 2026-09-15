import enum
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant
    from app.modules.users.models import User
    from app.modules.training_plans.models import TrainingPlan, WorkoutDay


class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class SessionType(str, enum.Enum):
    PERSONAL_TRAINING = "personal_training"
    GROUP_TRAINING = "group_training"
    ASSESSMENT = "assessment"
    CONSULTATION = "consultation"


class TrainingSession(Base, TimestampMixin):
    """Represents a scheduled training session between a coach and client within a gym tenant."""
    __tablename__ = "training_sessions"

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
    coach_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    training_plan_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("training_plans.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )
    workout_day_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("workout_days.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=SessionStatus.SCHEDULED.value,
        index=True,
        nullable=False
    )
    session_type: Mapped[str] = mapped_column(
        String(50),
        default=SessionType.PERSONAL_TRAINING.value,
        nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    coach: Mapped["User"] = relationship("User", foreign_keys=[coach_id])
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])
    training_plan: Mapped[Optional["TrainingPlan"]] = relationship("TrainingPlan", foreign_keys=[training_plan_id])
    workout_day: Mapped[Optional["WorkoutDay"]] = relationship("WorkoutDay", foreign_keys=[workout_day_id])

    __table_args__ = (
        Index("ix_training_sessions_tenant_coach", "tenant_id", "coach_id"),
        Index("ix_training_sessions_tenant_client", "tenant_id", "client_id"),
        Index("ix_training_sessions_coach_start", "coach_id", "scheduled_start"),
    )
