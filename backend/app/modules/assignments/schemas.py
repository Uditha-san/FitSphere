from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CoachClientAssignmentBase(BaseModel):
    coach_id: str = Field(..., description="UUID of the assigned coach")
    client_id: str = Field(..., description="UUID of the assigned client")
    tenant_id: Optional[str] = Field(
        None,
        description="UUID of the gym tenant (inferred from authenticated gym_admin or validated coach/client)"
    )


class CoachClientAssignmentCreate(CoachClientAssignmentBase):
    pass


class CoachClientAssignmentUpdate(BaseModel):
    is_active: Optional[bool] = Field(None, description="Set to false to deactivate assignment")


class CoachClientAssignmentRead(BaseModel):
    id: str
    tenant_id: str
    coach_id: str
    client_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
