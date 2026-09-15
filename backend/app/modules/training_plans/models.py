import enum
import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Integer,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant
    from app.modules.users.models import User


class PlanStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TrainingPlan(Base, TimestampMixin):
    """Represents a structured training plan assigned to a client by a coach within a gym tenant."""
    __tablename__ = "training_plans"

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
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default=PlanStatus.DRAFT.value,
        index=True,
        nullable=False
    )
    start_date: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    end_date: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    coach: Mapped["User"] = relationship("User", foreign_keys=[coach_id])
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])
    workout_days: Mapped[List["WorkoutDay"]] = relationship(
        "WorkoutDay",
        back_populates="training_plan",
        cascade="all, delete-orphan",
        order_by="WorkoutDay.order_index",
        lazy="selectin"
    )

    __table_args__ = (
        Index("ix_training_plans_tenant_coach", "tenant_id", "coach_id"),
        Index("ix_training_plans_tenant_client", "tenant_id", "client_id"),
    )


class WorkoutDay(Base, TimestampMixin):
    """Represents a single workout day or session inside a training plan."""
    __tablename__ = "workout_days"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    training_plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("training_plans.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    day_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    order_index: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # Relationships
    training_plan: Mapped["TrainingPlan"] = relationship(
        "TrainingPlan",
        back_populates="workout_days"
    )
    tenant: Mapped["Tenant"] = relationship("Tenant")
    exercises: Mapped[List["WorkoutExercise"]] = relationship(
        "WorkoutExercise",
        back_populates="workout_day",
        cascade="all, delete-orphan",
        order_by="WorkoutExercise.order_index",
        lazy="selectin"
    )

    __table_args__ = (
        Index("ix_workout_days_plan_order", "training_plan_id", "order_index"),
    )


class WorkoutExercise(Base, TimestampMixin):
    """Represents an individual exercise / workout item scheduled in a workout day."""
    __tablename__ = "workout_exercises"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    workout_day_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("workout_days.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    exercise_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    sets: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False
    )
    repetitions: Mapped[str] = mapped_column(
        String(50),
        default="10",
        nullable=False
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    rest_seconds: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    order_index: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # Relationships
    workout_day: Mapped["WorkoutDay"] = relationship(
        "WorkoutDay",
        back_populates="exercises"
    )
    tenant: Mapped["Tenant"] = relationship("Tenant")

    __table_args__ = (
        Index("ix_workout_exercises_day_order", "workout_day_id", "order_index"),
    )
