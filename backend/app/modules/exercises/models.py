import enum
import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant
    from app.modules.users.models import User
    from app.modules.training_plans.models import WorkoutExercise


class Difficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ExerciseType(str, enum.Enum):
    STRENGTH = "strength"
    CARDIO = "cardio"
    MOBILITY = "mobility"
    STRETCHING = "stretching"
    CORE = "core"


class Exercise(Base, TimestampMixin):
    """Represents a standardized or gym-specific movement in the exercise library."""
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    tenant_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=True  # NULL indicates platform/global exercise
    )
    name: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    instructions: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    muscle_group: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False
    )
    secondary_muscle_group: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    equipment: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False
    )
    difficulty: Mapped[str] = mapped_column(
        String(50),
        default=Difficulty.INTERMEDIATE.value,
        index=True,
        nullable=False
    )
    exercise_type: Mapped[str] = mapped_column(
        String(50),
        default=ExerciseType.STRENGTH.value,
        index=True,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        index=True,
        nullable=False
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Relationships
    tenant: Mapped[Optional["Tenant"]] = relationship("Tenant")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    videos: Mapped[List["ExerciseVideo"]] = relationship(
        "ExerciseVideo",
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="ExerciseVideo.created_at.asc()",
        lazy="selectin"
    )
    workout_exercises: Mapped[List["WorkoutExercise"]] = relationship(
        "WorkoutExercise",
        back_populates="exercise"
    )

    __table_args__ = (
        Index("ix_exercises_tenant_active", "tenant_id", "is_active"),
    )


class ExerciseVideo(Base, TimestampMixin):
    """Represents an instructional video attached to an exercise."""
    __tablename__ = "exercise_videos"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    exercise_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    video_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    exercise: Mapped["Exercise"] = relationship("Exercise", back_populates="videos")

    __table_args__ = (
        Index("ix_exercise_videos_exercise_primary", "exercise_id", "is_primary"),
    )
