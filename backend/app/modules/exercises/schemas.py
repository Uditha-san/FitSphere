import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.assignments.schemas import UserSummary
from app.modules.exercises.models import Difficulty, ExerciseType


# --- Video Schemas ---

class ExerciseVideoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title of the technique tutorial video")
    description: Optional[str] = Field(None, max_length=2000, description="Coaching tips and form cues")
    video_url: str = Field(..., min_length=5, max_length=1000, description="Web-playable video URL (e.g. YouTube, Vimeo, MP4)")
    thumbnail_url: Optional[str] = Field(None, max_length=1000, description="Thumbnail image URL")
    duration_seconds: Optional[int] = Field(None, ge=0, le=86400, description="Duration of video in seconds")
    is_primary: bool = Field(False, description="Whether this is the primary technique video")

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, v: str) -> str:
        url = v.strip()
        if not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
            raise ValueError("video_url must be a valid HTTP/HTTPS URL")
        return url

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        url = v.strip()
        if not url:
            return None
        if not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
            raise ValueError("thumbnail_url must be a valid HTTP/HTTPS URL")
        return url


class ExerciseVideoCreate(ExerciseVideoBase):
    pass


class ExerciseVideoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    video_url: Optional[str] = Field(None, min_length=5, max_length=1000)
    thumbnail_url: Optional[str] = Field(None, max_length=1000)
    duration_seconds: Optional[int] = Field(None, ge=0, le=86400)
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        url = v.strip()
        if not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
            raise ValueError("video_url must be a valid HTTP/HTTPS URL")
        return url

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        url = v.strip()
        if not url:
            return None
        if not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
            raise ValueError("thumbnail_url must be a valid HTTP/HTTPS URL")
        return url


class ExerciseVideoRead(ExerciseVideoBase):
    id: str
    exercise_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Exercise Schemas ---

class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the exercise (e.g. Barbell Squat)")
    description: Optional[str] = Field(None, max_length=2000, description="Short summary of the exercise and primary benefits")
    instructions: Optional[str] = Field(None, max_length=5000, description="Step-by-step performance cues and technique guidelines")
    muscle_group: str = Field(..., min_length=1, max_length=100, description="Primary muscle group (e.g. Chest, Quads, Back)")
    secondary_muscle_group: Optional[str] = Field(None, max_length=100, description="Secondary muscle groups (e.g. Triceps, Glutes)")
    equipment: str = Field(..., min_length=1, max_length=100, description="Required equipment (e.g. Barbell, Dumbbell, Machine, Bodyweight)")
    difficulty: Difficulty = Field(default=Difficulty.INTERMEDIATE, description="Difficulty rating: beginner, intermediate, advanced")
    exercise_type: ExerciseType = Field(default=ExerciseType.STRENGTH, description="Type: strength, cardio, mobility, stretching, core")


class ExerciseCreate(ExerciseBase):
    tenant_id: Optional[str] = Field(None, description="Optional tenant ID. NULL creates a platform-wide exercise (Super Admin only)")
    videos: Optional[List[ExerciseVideoCreate]] = Field(None, description="Initial instructional videos")


class ExerciseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    instructions: Optional[str] = Field(None, max_length=5000)
    muscle_group: Optional[str] = Field(None, min_length=1, max_length=100)
    secondary_muscle_group: Optional[str] = Field(None, max_length=100)
    equipment: Optional[str] = Field(None, min_length=1, max_length=100)
    difficulty: Optional[Difficulty] = None
    exercise_type: Optional[ExerciseType] = None
    is_active: Optional[bool] = None


class ExerciseBrief(BaseModel):
    id: str
    name: str
    muscle_group: str
    equipment: str
    difficulty: str
    exercise_type: str
    tenant_id: Optional[str] = None
    is_active: bool
    primary_video: Optional[ExerciseVideoRead] = None

    model_config = ConfigDict(from_attributes=True)


class ExerciseRead(ExerciseBase):
    id: str
    tenant_id: Optional[str] = None
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    primary_video: Optional[ExerciseVideoRead] = None
    videos_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ExerciseDetail(ExerciseRead):
    creator: Optional[UserSummary] = None
    videos: List[ExerciseVideoRead] = []

    model_config = ConfigDict(from_attributes=True)
