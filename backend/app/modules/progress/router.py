from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_coach
from app.db.session import get_db
from app.modules.progress.schemas import (
    ProgressRecordCreate,
    ProgressRecordRead,
    ProgressRecordUpdate,
    ProgressLatestSummary,
)
from app.modules.progress.service import progress_service
from app.modules.users.models import User

router = APIRouter()


@router.post(
    "/",
    response_model=ProgressRecordRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record Client Progress",
    description="Create a new client progress measurement record. "
                "Coaches record for their assigned clients; Gym Admins record within their gym.",
)
def create_progress_record(
    record_in: ProgressRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return progress_service.create(db, obj_in=record_in, acting_user=current_user)


@router.get(
    "/",
    response_model=List[ProgressRecordRead],
    summary="List Progress Records",
    description="List progress records scoped by caller role and tenant boundary. "
                "Clients view their own records; coaches view records for their clients; "
                "gym admins view records across their gym; super admins view platform-wide.",
)
def list_progress_records(
    skip: int = 0,
    limit: int = 100,
    coach_id: Optional[str] = Query(None, description="Filter by coach UUID"),
    client_id: Optional[str] = Query(None, description="Filter by client UUID"),
    date_from: Optional[datetime] = Query(None, description="Filter records on or after date"),
    date_to: Optional[datetime] = Query(None, description="Filter records on or before date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return progress_service.get_multi_scoped(
        db,
        acting_user=current_user,
        coach_id=coach_id,
        client_id=client_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/clients/{client_id}/history",
    response_model=List[ProgressRecordRead],
    summary="Get Client Progress History",
    description="Retrieve chronological progress history for a specific client.",
)
def get_client_progress_history(
    client_id: str,
    skip: int = 0,
    limit: int = 100,
    date_from: Optional[datetime] = Query(None, description="Filter records on or after date"),
    date_to: Optional[datetime] = Query(None, description="Filter records on or before date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return progress_service.get_client_history(
        db,
        client_id=client_id,
        acting_user=current_user,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/clients/{client_id}/latest",
    response_model=ProgressLatestSummary,
    summary="Get Client Latest Progress Summary",
    description="Retrieve latest measurements, record count, and overall metric changes for a client.",
)
def get_client_progress_summary(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return progress_service.get_client_summary(
        db,
        client_id=client_id,
        acting_user=current_user,
    )


@router.get(
    "/{progress_id}",
    response_model=ProgressRecordRead,
    summary="Get Progress Record Details",
    description="Retrieve details of a single progress record subject to RBAC and tenant boundaries.",
)
def get_progress_record(
    progress_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return progress_service.get_with_details(db, id=progress_id, acting_user=current_user)


@router.patch(
    "/{progress_id}",
    response_model=ProgressRecordRead,
    summary="Update Progress Record",
    description="Update measurements or notes on an existing progress record. "
                "Permitted for the recording coach or gym admin in their gym.",
)
def update_progress_record(
    progress_id: str,
    record_in: ProgressRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return progress_service.update(
        db, id=progress_id, obj_in=record_in, acting_user=current_user
    )


@router.delete(
    "/{progress_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Progress Record",
    description="Remove a progress record. Permitted for the recording coach, gym admin, or super admin.",
)
def delete_progress_record(
    progress_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    progress_service.delete(db, id=progress_id, acting_user=current_user)
    return None
