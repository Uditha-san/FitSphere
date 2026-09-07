from pydantic import BaseModel
from typing import Optional


class DatabaseHealth(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    project: str
    environment: str
    database: DatabaseHealth
