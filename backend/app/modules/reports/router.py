from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_active_user,
    require_coach,
    require_gym_admin,
    require_super_admin,
)
from app.db.session import get_db
from app.modules.reports.schemas import (
    ReportPeriodType,
    ClientOverviewReport,
    ClientProgressReport,
    ClientTrainingReport,
    CoachOverviewReport,
    CoachClientSummary,
    GymOverviewReport,
    GymClientSummary,
    GymCoachSummary,
    GymSessionReport,
    PlatformOverviewReport,
    TenantSummaryReport,
)
from app.modules.reports.service import reports_service
from app.modules.users.models import User


router = APIRouter()


# ============================================================================
# Client Reports
# ============================================================================

@router.get(
    "/client/overview",
    response_model=ClientOverviewReport,
    summary="Client Overview Report",
    description="Retrieve client personal summary report including coach pairing, active plan, and session metrics.",
)
def get_client_overview_report(
    client_id: Optional[str] = Query(None, description="Client UUID (defaults to authenticated user)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_client_id = client_id or current_user.id
    return reports_service.get_client_overview(db, client_id=target_client_id, acting_user=current_user)


@router.get(
    "/client/progress",
    response_model=ClientProgressReport,
    summary="Client Progress Report",
    description="Retrieve client progress measurements, starting/current/delta values, and historical trend points.",
)
def get_client_progress_report(
    client_id: Optional[str] = Query(None, description="Client UUID (defaults to authenticated user)"),
    period: ReportPeriodType = Query(ReportPeriodType.ALL_TIME, description="Report period type"),
    start_date: Optional[datetime] = Query(None, description="Custom period start date"),
    end_date: Optional[datetime] = Query(None, description="Custom period end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_client_id = client_id or current_user.id
    return reports_service.get_client_progress_report(
        db,
        client_id=target_client_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        acting_user=current_user,
    )


@router.get(
    "/client/training",
    response_model=ClientTrainingReport,
    summary="Client Training Report",
    description="Retrieve client training session outcomes, completion rate, and session activity by date.",
)
def get_client_training_report(
    client_id: Optional[str] = Query(None, description="Client UUID (defaults to authenticated user)"),
    period: ReportPeriodType = Query(ReportPeriodType.ALL_TIME, description="Report period type"),
    start_date: Optional[datetime] = Query(None, description="Custom period start date"),
    end_date: Optional[datetime] = Query(None, description="Custom period end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    target_client_id = client_id or current_user.id
    return reports_service.get_client_training_report(
        db,
        client_id=target_client_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        acting_user=current_user,
    )


# ============================================================================
# Coach Reports
# ============================================================================

@router.get(
    "/coach/overview",
    response_model=CoachOverviewReport,
    summary="Coach Overview Report",
    description="Retrieve coach performance statistics, active athlete roster count, and training plan stats.",
)
def get_coach_overview_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return reports_service.get_coach_overview(db, acting_user=current_user)


@router.get(
    "/coach/clients",
    response_model=List[CoachClientSummary],
    summary="Coach Assigned Clients Report",
    description="Retrieve list of athletes assigned to the coach with session and progress health indicators.",
)
def get_coach_clients_report(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return reports_service.get_coach_clients(db, acting_user=current_user, skip=skip, limit=limit)


@router.get(
    "/coach/clients/{client_id}",
    response_model=ClientOverviewReport,
    summary="Coach Athlete Deep Dive Report",
    description="Retrieve deep performance overview for a specific assigned athlete.",
)
def get_coach_client_deep_dive(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coach),
):
    return reports_service.get_client_overview(db, client_id=client_id, acting_user=current_user)


# ============================================================================
# Gym Admin Reports
# ============================================================================

@router.get(
    "/gym/overview",
    response_model=GymOverviewReport,
    summary="Gym Overview Report",
    description="Retrieve facility-level aggregates: members, coaches, plans, sessions, and completion rate.",
)
def get_gym_overview_report(
    tenant_id: Optional[str] = Query(None, description="Tenant UUID (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gym_admin),
):
    return reports_service.get_gym_overview(db, acting_user=current_user, tenant_id=tenant_id)


@router.get(
    "/gym/clients",
    response_model=List[GymClientSummary],
    summary="Gym Clients Activity Report",
    description="Retrieve facility client activity table with coach assignment and session counts.",
)
def get_gym_clients_report(
    tenant_id: Optional[str] = Query(None, description="Tenant UUID (Super Admin only)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gym_admin),
):
    return reports_service.get_gym_clients(db, acting_user=current_user, tenant_id=tenant_id, skip=skip, limit=limit)


@router.get(
    "/gym/coaches",
    response_model=List[GymCoachSummary],
    summary="Gym Coaches Activity Report",
    description="Retrieve facility coach performance table with active roster size and session completion rate.",
)
def get_gym_coaches_report(
    tenant_id: Optional[str] = Query(None, description="Tenant UUID (Super Admin only)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gym_admin),
):
    return reports_service.get_gym_coaches(db, acting_user=current_user, tenant_id=tenant_id, skip=skip, limit=limit)


@router.get(
    "/gym/sessions",
    response_model=GymSessionReport,
    summary="Gym Sessions Report",
    description="Retrieve facility session outcomes breakdown and date-by-date activity timeline.",
)
def get_gym_sessions_report(
    period: ReportPeriodType = Query(ReportPeriodType.ALL_TIME, description="Report period type"),
    start_date: Optional[datetime] = Query(None, description="Custom period start date"),
    end_date: Optional[datetime] = Query(None, description="Custom period end date"),
    tenant_id: Optional[str] = Query(None, description="Tenant UUID (Super Admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gym_admin),
):
    return reports_service.get_gym_sessions(
        db,
        acting_user=current_user,
        period=period,
        start_date=start_date,
        end_date=end_date,
        tenant_id=tenant_id,
    )


# ============================================================================
# Super Admin Reports
# ============================================================================

@router.get(
    "/super-admin/overview",
    response_model=PlatformOverviewReport,
    summary="Platform Overview Report",
    description="Platform-wide global statistics across all gyms, users, training plans, and sessions.",
)
def get_platform_overview_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return reports_service.get_platform_overview(db, acting_user=current_user)


@router.get(
    "/super-admin/gyms",
    response_model=List[TenantSummaryReport],
    summary="Platform Tenants Report",
    description="Audit list of all gyms with member, coach, session, and activity metrics.",
)
def get_tenants_reports(
    search: Optional[str] = Query(None, description="Search gyms by name or slug"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return reports_service.get_tenants_reports(db, acting_user=current_user, search=search, skip=skip, limit=limit)


@router.get(
    "/super-admin/gyms/{tenant_id}",
    response_model=GymOverviewReport,
    summary="Specific Gym Audit Report",
    description="Inspect full facility report for a specific gym tenant.",
)
def get_specific_gym_report(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return reports_service.get_gym_overview(db, acting_user=current_user, tenant_id=tenant_id)
