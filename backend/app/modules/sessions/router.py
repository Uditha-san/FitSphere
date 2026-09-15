from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_coach
from app.db.session import get_db
from app.modules.sessions.schemas import (
    TrainingSessionCreate,
    TrainingSessionRead,
    TrainingSessionUpdate,
)
from app.modules.sessions.service import training_session_service
from app.modules.users.models import User

router = APIRouter()


@router.post(
    "/",
    response_model=TrainingSessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Training Session",
    description="Schedule a new training session for an actively assigned client. "
                "Coaches can schedule for themselves; Gym Admins can schedule within their facility.",
)
def create_session(
    session_in: TrainingSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.create(db, obj_in=session_in, acting_user=current_user)


@router.get(
    "/",
    response_model=List[TrainingSessionRead],
    summary="List Training Sessions",
    description="List training sessions scoped by caller role and tenant boundary. "
                "Coaches view their sessions; clients view their sessions; "
                "gym_admin views sessions within gym; super_admin can view all.",
)
def list_sessions(
    skip: int = 0,
    limit: int = 100,
    coach_id: Optional[str] = Query(None, description="Filter by coach UUID"),
    client_id: Optional[str] = Query(None, description="Filter by client UUID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant UUID (super_admin only)"),
    status: Optional[str] = Query(None, description="Filter by status (scheduled, confirmed, in_progress, completed, cancelled, no_show)"),
    date_from: Optional[datetime] = Query(None, description="Filter sessions starting on or after date"),
    date_to: Optional[datetime] = Query(None, description="Filter sessions ending on or before date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_session_service.get_multi(
        db,
        acting_user=current_user,
        skip=skip,
        limit=limit,
        coach_id=coach_id,
        client_id=client_id,
        tenant_id=tenant_id,
        session_status=status,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/{session_id}",
    response_model=TrainingSessionRead,
    summary="Get Training Session Details",
    description="Retrieve details of a specific training session subject to RBAC and tenant boundaries.",
)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return training_session_service.get(db, id=session_id, acting_user=current_user)


@router.patch(
    "/{session_id}",
    response_model=TrainingSessionRead,
    summary="Update Training Session",
    description="Update session time, workout plan/day link, type, or notes. "
                "Permitted for coaches on their own sessions or gym admins in their tenant.",
)
def update_session(
    session_id: str,
    session_in: TrainingSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.update(
        db, id=session_id, obj_in=session_in, acting_user=current_user
    )


@router.post(
    "/{session_id}/confirm",
    response_model=TrainingSessionRead,
    summary="Confirm Session",
    description="Transition session from 'scheduled' to 'confirmed'.",
)
def confirm_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.confirm(db, id=session_id, acting_user=current_user)


@router.post(
    "/{session_id}/start",
    response_model=TrainingSessionRead,
    summary="Start Session",
    description="Transition session to 'in_progress'.",
)
def start_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.start(db, id=session_id, acting_user=current_user)


@router.post(
    "/{session_id}/complete",
    response_model=TrainingSessionRead,
    summary="Complete Session",
    description="Transition session to 'completed'.",
)
def complete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.complete(db, id=session_id, acting_user=current_user)


@router.post(
    "/{session_id}/cancel",
    response_model=TrainingSessionRead,
    summary="Cancel Session",
    description="Transition session to 'cancelled'.",
)
def cancel_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.cancel(db, id=session_id, acting_user=current_user)


@router.post(
    "/{session_id}/no-show",
    response_model=TrainingSessionRead,
    summary="Mark Session No-Show",
    description="Transition session to 'no_show'.",
)
def mark_session_no_show(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return training_session_service.mark_no_show(db, id=session_id, acting_user=current_user)
