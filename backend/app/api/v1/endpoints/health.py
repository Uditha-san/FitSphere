import time
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import HealthResponse, DatabaseHealth

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check the health of the FastAPI service and test connection to PostgreSQL.",
)
def check_health(db: Session = Depends(get_db)):
    db_status = "connected"
    error_msg = None
    latency = None

    start_time = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - start_time) * 1000, 2)
    except Exception as exc:
        db_status = "disconnected"
        error_msg = str(exc)

    overall_status = "healthy" if db_status == "connected" else "degraded"

    payload = {
        "status": overall_status,
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "latency_ms": latency,
            "error": error_msg,
        },
    }

    status_code = status.HTTP_200_OK if overall_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=payload)
