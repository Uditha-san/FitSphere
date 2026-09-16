from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.assignments.schemas import UserSummary
from app.modules.exercises.schemas import ExerciseBrief


# --- Exercise Schemas ---

class WorkoutExerciseBase(BaseModel):
    exercise_name: str = Field(..., min_length=1, max_length=255, description="Name of the exercise")
    exercise_id: Optional[str] = Field(None, description="Optional UUID reference to library exercise")
    description: Optional[str] = Field(None, max_length=500, description="Exercise technique instructions")
    sets: int = Field(default=3, ge=1, le=50, description="Target number of sets")
    repetitions: str = Field(default="10", min_length=1, max_length=50, description="Target reps (e.g. 10, 8-12, AMRAP)")
    duration_seconds: Optional[int] = Field(None, ge=0, description="Target duration in seconds if timed")
    rest_seconds: int = Field(default=60, ge=0, le=600, description="Rest period between sets in seconds")
    notes: Optional[str] = Field(None, max_length=500, description="Coach coaching cues or safety notes")
    order_index: int = Field(default=0, ge=0, description="Position within the workout day")


class WorkoutExerciseCreate(WorkoutExerciseBase):
    pass


class WorkoutExerciseUpdate(BaseModel):
    exercise_name: Optional[str] = Field(None, min_length=1, max_length=255)
    exercise_id: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    sets: Optional[int] = Field(None, ge=1, le=50)
    repetitions: Optional[str] = Field(None, min_length=1, max_length=50)
    duration_seconds: Optional[int] = Field(None, ge=0)
    rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    notes: Optional[str] = Field(None, max_length=500)
    order_index: Optional[int] = Field(None, ge=0)


class WorkoutExerciseRead(WorkoutExerciseBase):
    id: str
    workout_day_id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    exercise: Optional[ExerciseBrief] = None

    model_config = ConfigDict(from_attributes=True)


# --- Workout Day Schemas ---

class WorkoutDayBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Day title (e.g. Day 1: Upper Body)")
    description: Optional[str] = Field(None, max_length=500, description="Day focus and warm-up notes")
    day_number: Optional[int] = Field(None, ge=1, le=31, description="Sequential day number or day of week")
    order_index: int = Field(default=0, ge=0, description="Ordering of this day in the plan")


class WorkoutDayCreate(WorkoutDayBase):
    pass


class WorkoutDayUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)
    day_number: Optional[int] = Field(None, ge=1, le=31)
    order_index: Optional[int] = Field(None, ge=0)


class WorkoutDayRead(WorkoutDayBase):
    id: str
    training_plan_id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    exercises: List[WorkoutExerciseRead] = []

    model_config = ConfigDict(from_attributes=True)


# --- Training Plan Schemas ---

class TrainingPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the training plan")
    description: Optional[str] = Field(None, max_length=2000, description="Overview and goals of the plan")
    status: str = Field(default="draft", description="Status: draft, active, completed, archived")
    start_date: Optional[datetime] = Field(None, description="Planned start timestamp")
    end_date: Optional[datetime] = Field(None, description="Planned end timestamp")


class TrainingPlanCreate(BaseModel):
    client_id: str = Field(..., description="UUID of the assigned client")
    coach_id: Optional[str] = Field(None, description="UUID of coach (inferred for coach role; required for admin)")
    tenant_id: Optional[str] = Field(None, description="UUID of gym tenant (inferred from authenticated tenant)")
    name: str = Field(..., min_length=1, max_length=255, description="Name of the training plan")
    description: Optional[str] = Field(None, max_length=2000, description="Overview and goals")
    status: Optional[str] = Field("draft", description="Initial plan status: draft or active")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TrainingPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(None, description="draft, active, completed, archived")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TrainingPlanSummary(TrainingPlanBase):
    id: str
    tenant_id: str
    coach_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    coach: Optional[UserSummary] = None
    client: Optional[UserSummary] = None
    days_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TrainingPlanRead(TrainingPlanBase):
    id: str
    tenant_id: str
    coach_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    coach: Optional[UserSummary] = None
    client: Optional[UserSummary] = None
    workout_days: List[WorkoutDayRead] = []

    model_config = ConfigDict(from_attributes=True)
