from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.assignments.schemas import UserSummary


# --- Nested Brief Schemas ---

class TrainingSessionBrief(BaseModel):
    id: str
    session_type: str
    scheduled_start: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class TrainingPlanBrief(BaseModel):
    id: str
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)


# --- Progress Record Schemas ---

class ProgressRecordBase(BaseModel):
    recorded_at: datetime = Field(..., description="Date and time when measurements were taken (timezone aware)")
    weight_kg: Optional[Decimal] = Field(None, ge=10, le=500, description="Body weight in kilograms")
    body_fat_percentage: Optional[Decimal] = Field(None, ge=0, le=100, description="Body fat percentage (0 - 100)")
    chest_cm: Optional[Decimal] = Field(None, ge=20, le=300, description="Chest circumference in cm")
    waist_cm: Optional[Decimal] = Field(None, ge=20, le=300, description="Waist circumference in cm")
    hip_cm: Optional[Decimal] = Field(None, ge=20, le=300, description="Hip circumference in cm")
    arm_cm: Optional[Decimal] = Field(None, ge=10, le=150, description="Arm circumference in cm")
    thigh_cm: Optional[Decimal] = Field(None, ge=10, le=200, description="Thigh circumference in cm")
    notes: Optional[str] = Field(None, max_length=2000, description="Coaching assessment or qualitative notes")


class ProgressRecordCreate(ProgressRecordBase):
    client_id: str = Field(..., description="UUID of the client")
    coach_id: Optional[str] = Field(None, description="UUID of coach (inferred for coach; permitted for admin)")
    tenant_id: Optional[str] = Field(None, description="UUID of gym tenant (inferred from context)")
    training_session_id: Optional[str] = Field(None, description="Optional UUID of associated training session")
    training_plan_id: Optional[str] = Field(None, description="Optional UUID of associated training plan")

    @field_validator("recorded_at")
    @classmethod
    def validate_recorded_at_tz(cls, v: datetime) -> datetime:
        if v.tzinfo is None or v.tzinfo.utcoffset(v) is None:
            raise ValueError("recorded_at must include timezone information")
        return v

    @model_validator(mode="after")
    def check_at_least_one_entry(self):
        metrics = [
            self.weight_kg,
            self.body_fat_percentage,
            self.chest_cm,
            self.waist_cm,
            self.hip_cm,
            self.arm_cm,
            self.thigh_cm,
            self.notes,
        ]
        if all(m is None or (isinstance(m, str) and not m.strip()) for m in metrics):
            raise ValueError("At least one measurement metric or note must be provided.")
        return self


class ProgressRecordUpdate(BaseModel):
    recorded_at: Optional[datetime] = None
    weight_kg: Optional[Decimal] = Field(None, ge=10, le=500)
    body_fat_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    chest_cm: Optional[Decimal] = Field(None, ge=20, le=300)
    waist_cm: Optional[Decimal] = Field(None, ge=20, le=300)
    hip_cm: Optional[Decimal] = Field(None, ge=20, le=300)
    arm_cm: Optional[Decimal] = Field(None, ge=10, le=150)
    thigh_cm: Optional[Decimal] = Field(None, ge=10, le=200)
    notes: Optional[str] = Field(None, max_length=2000)
    training_session_id: Optional[str] = None
    training_plan_id: Optional[str] = None

    @field_validator("recorded_at")
    @classmethod
    def validate_recorded_at_tz(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and (v.tzinfo is None or v.tzinfo.utcoffset(v) is None):
            raise ValueError("recorded_at must include timezone information")
        return v


class ProgressRecordRead(ProgressRecordBase):
    id: str
    tenant_id: str
    client_id: str
    coach_id: str
    training_session_id: Optional[str] = None
    training_plan_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    client: Optional[UserSummary] = None
    coach: Optional[UserSummary] = None
    training_session: Optional[TrainingSessionBrief] = None
    training_plan: Optional[TrainingPlanBrief] = None

    model_config = ConfigDict(from_attributes=True)


class ProgressLatestSummary(BaseModel):
    client_id: str
    latest_record: Optional[ProgressRecordRead] = None
    total_records: int = 0
    first_recorded_at: Optional[datetime] = None
    last_recorded_at: Optional[datetime] = None
    weight_change_kg: Optional[Decimal] = None
    body_fat_change_percentage: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)
