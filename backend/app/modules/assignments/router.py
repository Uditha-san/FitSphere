from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.modules.assignments.schemas import (
    CoachClientAssignmentCreate,
    CoachClientAssignmentRead,
)
from app.modules.assignments.service import assignment_service
from app.modules.users.models import User

router = APIRouter()


@router.post(
    "/",
    response_model=CoachClientAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Assign Coach to Client",
    description="Create an assignment linking a coach to a client within the same gym. "
                "Gated to gym_admin (own tenant only) and super_admin.",
)
def create_assignment(
    assignment_in: CoachClientAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return assignment_service.create(
        db, obj_in=assignment_in, acting_user=current_user
    )


@router.get(
    "/",
    response_model=List[CoachClientAssignmentRead],
    summary="List Coach-Client Assignments",
    description="List assignments scoped by authenticated user role and gym tenant. "
                "Coaches view their own assigned clients; clients view their own assigned coaches; "
                "gym_admin views gym assignments; super_admin can view all.",
)
def list_assignments(
    skip: int = 0,
    limit: int = 100,
    coach_id: Optional[str] = Query(None, description="Filter by coach UUID"),
    client_id: Optional[str] = Query(None, description="Filter by client UUID"),
    tenant_id: Optional[str] = Query(None, description="Administrative filter for super_admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return assignment_service.get_multi(
        db,
        acting_user=current_user,
        skip=skip,
        limit=limit,
        coach_id=coach_id,
        client_id=client_id,
        tenant_id=tenant_id,
        is_active=is_active,
    )


@router.get(
    "/{assignment_id}",
    response_model=CoachClientAssignmentRead,
    summary="Get Assignment Details",
    description="Fetch single assignment by UUID with tenant and participant isolation.",
)
def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return assignment_service.get(
        db, id=assignment_id, acting_user=current_user
    )


@router.delete(
    "/{assignment_id}",
    response_model=CoachClientAssignmentRead,
    summary="Deactivate Coach-Client Assignment",
    description="Deactivate an existing assignment. Gated to gym_admin (own gym) and super_admin.",
)
def deactivate_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return assignment_service.deactivate(
        db, id=assignment_id, acting_user=current_user
    )
