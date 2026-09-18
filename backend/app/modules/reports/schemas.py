import enum
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.assignments.schemas import UserSummary
from app.modules.progress.schemas import ProgressRecordRead, TrainingPlanBrief


class ReportPeriodType(str, enum.Enum):
    ALL_TIME = "all_time"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    CUSTOM = "custom"


class ReportPeriodInfo(BaseModel):
    period_type: ReportPeriodType
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SessionStatistics(BaseModel):
    total: int = 0
    completed: int = 0
    cancelled: int = 0
    no_show: int = 0
    scheduled: int = 0
    in_progress: int = 0
    eligible_outcome: int = 0
    completion_rate: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SessionDatePoint(BaseModel):
    date: str
    total: int = 0
    completed: int = 0
    cancelled: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProgressMetricChange(BaseModel):
    earliest_value: Optional[Decimal] = None
    latest_value: Optional[Decimal] = None
    change: Optional[Decimal] = None
    earliest_date: Optional[datetime] = None
    latest_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProgressChartPoint(BaseModel):
    recorded_at: datetime
    weight_kg: Optional[Decimal] = None
    body_fat_percentage: Optional[Decimal] = None
    chest_cm: Optional[Decimal] = None
    waist_cm: Optional[Decimal] = None
    hip_cm: Optional[Decimal] = None
    arm_cm: Optional[Decimal] = None
    thigh_cm: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


# --- Client Reports ---

class ClientOverviewReport(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    client_email: str
    assigned_coach: Optional[UserSummary] = None
    active_training_plan: Optional[TrainingPlanBrief] = None
    session_stats: SessionStatistics
    total_progress_records: int = 0
    latest_progress: Optional[ProgressRecordRead] = None

    model_config = ConfigDict(from_attributes=True)


class ClientProgressReport(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    period: ReportPeriodInfo
    total_records: int = 0
    weight: ProgressMetricChange
    body_fat_percentage: ProgressMetricChange
    chest_cm: ProgressMetricChange
    waist_cm: ProgressMetricChange
    hip_cm: ProgressMetricChange
    arm_cm: ProgressMetricChange
    thigh_cm: ProgressMetricChange
    history: List[ProgressChartPoint] = []

    model_config = ConfigDict(from_attributes=True)


class ClientTrainingReport(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    period: ReportPeriodInfo
    session_stats: SessionStatistics
    activity_by_date: List[SessionDatePoint] = []

    model_config = ConfigDict(from_attributes=True)


# --- Coach Reports ---

class CoachOverviewReport(BaseModel):
    coach_id: str
    coach_name: Optional[str] = None
    coach_email: str
    total_assigned_clients: int = 0
    active_assigned_clients: int = 0
    total_training_plans: int = 0
    active_training_plans: int = 0
    session_stats: SessionStatistics

    model_config = ConfigDict(from_attributes=True)


class CoachClientSummary(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    email: str
    is_active_assignment: bool = True
    active_plan_name: Optional[str] = None
    sessions_completed: int = 0
    sessions_upcoming: int = 0
    last_progress_date: Optional[datetime] = None
    latest_weight_kg: Optional[Decimal] = None
    latest_body_fat_percentage: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


# --- Gym Admin Reports ---

class GymOverviewReport(BaseModel):
    tenant_id: str
    tenant_name: str
    total_clients: int = 0
    total_coaches: int = 0
    active_assignments: int = 0
    total_training_plans: int = 0
    active_training_plans: int = 0
    session_stats: SessionStatistics
    total_progress_records: int = 0

    model_config = ConfigDict(from_attributes=True)


class GymClientSummary(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    email: str
    assigned_coach_name: Optional[str] = None
    active_plan_name: Optional[str] = None
    total_sessions: int = 0
    completed_sessions: int = 0
    upcoming_sessions: int = 0
    latest_progress_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GymCoachSummary(BaseModel):
    coach_id: str
    coach_name: Optional[str] = None
    email: str
    assigned_clients_count: int = 0
    active_clients_count: int = 0
    training_plans_count: int = 0
    total_sessions: int = 0
    completed_sessions: int = 0
    upcoming_sessions: int = 0
    completion_rate: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class GymSessionReport(BaseModel):
    tenant_id: str
    tenant_name: str
    period: ReportPeriodInfo
    session_stats: SessionStatistics
    activity_by_date: List[SessionDatePoint] = []

    model_config = ConfigDict(from_attributes=True)


# --- Super Admin Reports ---

class PlatformOverviewReport(BaseModel):
    total_gyms: int = 0
    total_users: int = 0
    total_clients: int = 0
    total_coaches: int = 0
    total_gym_admins: int = 0
    total_training_plans: int = 0
    session_stats: SessionStatistics
    total_active_assignments: int = 0
    total_progress_records: int = 0
    total_exercises: int = 0

    model_config = ConfigDict(from_attributes=True)


class TenantSummaryReport(BaseModel):
    tenant_id: str
    name: str
    slug: str
    is_active: bool = True
    total_users: int = 0
    total_clients: int = 0
    total_coaches: int = 0
    total_training_plans: int = 0
    total_sessions: int = 0
    completed_sessions: int = 0
    active_assignments: int = 0

    model_config = ConfigDict(from_attributes=True)
