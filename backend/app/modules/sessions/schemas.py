from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.assignments.schemas import UserSummary


# --- Nested Brief Schemas ---

class TrainingPlanBrief(BaseModel):
    id: str
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class WorkoutDayBrief(BaseModel):
    id: str
    name: str
    day_number: Optional[int] = None
    order_index: int = 0

    model_config = ConfigDict(from_attributes=True)


# --- Session Base & Mutation Schemas ---

class TrainingSessionBase(BaseModel):
    scheduled_start: datetime = Field(..., description="Scheduled start time with timezone")
    scheduled_end: datetime = Field(..., description="Scheduled end time with timezone")
    session_type: str = Field(
        default="personal_training",
        description="Session type: personal_training, group_training, assessment, consultation"
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Session notes or agenda")


class TrainingSessionCreate(BaseModel):
    client_id: str = Field(..., description="UUID of the assigned client")
    coach_id: Optional[str] = Field(None, description="UUID of coach (inferred for coach; required for admin)")
    tenant_id: Optional[str] = Field(None, description="UUID of gym tenant (inferred from authenticated tenant)")
    training_plan_id: Optional[str] = Field(None, description="Optional UUID of assigned training plan")
    workout_day_id: Optional[str] = Field(None, description="Optional UUID of specific workout day")
    scheduled_start: datetime = Field(..., description="Session start time")
    scheduled_end: datetime = Field(..., description="Session end time")
    session_type: Optional[str] = Field(
        "personal_training",
        description="Session type: personal_training, group_training, assessment, consultation"
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Coaching notes or prep instructions")


class TrainingSessionUpdate(BaseModel):
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    session_type: Optional[str] = None
    training_plan_id: Optional[str] = None
    workout_day_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class TrainingSessionStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        description="Target status: confirmed, in_progress, completed, cancelled, no_show"
    )


# --- Read Schemas ---

class TrainingSessionRead(TrainingSessionBase):
    id: str
    tenant_id: str
    coach_id: str
    client_id: str
    training_plan_id: Optional[str] = None
    workout_day_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    coach: Optional[UserSummary] = None
    client: Optional[UserSummary] = None
    training_plan: Optional[TrainingPlanBrief] = None
    workout_day: Optional[WorkoutDayBrief] = None

    model_config = ConfigDict(from_attributes=True)
