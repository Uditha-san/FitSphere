# Re-export Base, mixins, and domain models for Alembic migration discovery
from app.common.models.base import Base, TimestampMixin
from app.common.models.tenant import TenantMixin
from app.modules.assignments.models import CoachClientAssignment
from app.modules.sessions.models import TrainingSession, SessionStatus, SessionType
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import TrainingPlan, WorkoutDay, WorkoutExercise, PlanStatus
from app.modules.users.models import User, UserRole

__all__ = [
    "Base",
    "TimestampMixin",
    "TenantMixin",
    "Tenant",
    "User",
    "UserRole",
    "CoachClientAssignment",
    "TrainingPlan",
    "WorkoutDay",
    "WorkoutExercise",
    "PlanStatus",
    "TrainingSession",
    "SessionStatus",
    "SessionType",
]

