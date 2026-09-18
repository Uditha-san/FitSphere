from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, selectinload

from app.modules.assignments.models import CoachClientAssignment
from app.modules.assignments.schemas import UserSummary
from app.modules.progress.models import ProgressRecord
from app.modules.progress.schemas import ProgressRecordRead, TrainingPlanBrief
from app.modules.reports.repository import reports_repository
from app.modules.reports.schemas import (
    ReportPeriodType,
    ReportPeriodInfo,
    SessionStatistics,
    SessionDatePoint,
    ProgressMetricChange,
    ProgressChartPoint,
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
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import TrainingPlan, PlanStatus
from app.modules.users.models import User, UserRole


class ReportsService:
    """Service orchestrating business analytics, tenant/role authorization, and date calculations."""

    def resolve_period_dates(
        self,
        period: ReportPeriodType,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[ReportPeriodInfo, Optional[datetime], Optional[datetime]]:
        """Validates and calculates timezone-aware start and end boundaries for the requested period."""
        now = datetime.now(timezone.utc)

        if period == ReportPeriodType.ALL_TIME:
            return (
                ReportPeriodInfo(period_type=period, start_date=None, end_date=None),
                None,
                None,
            )

        if period == ReportPeriodType.LAST_7_DAYS:
            s = now - timedelta(days=7)
            return (
                ReportPeriodInfo(period_type=period, start_date=s, end_date=now),
                s,
                now,
            )

        if period == ReportPeriodType.LAST_30_DAYS:
            s = now - timedelta(days=30)
            return (
                ReportPeriodInfo(period_type=period, start_date=s, end_date=now),
                s,
                now,
            )

        if period == ReportPeriodType.LAST_90_DAYS:
            s = now - timedelta(days=90)
            return (
                ReportPeriodInfo(period_type=period, start_date=s, end_date=now),
                s,
                now,
            )

        if period == ReportPeriodType.CUSTOM:
            if not start_date or not end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="start_date and end_date are both required when period is 'custom'",
                )

            # Ensure timezone-awareness
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)

            if start_date > end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date range: start_date must be before or equal to end_date",
                )

            return (
                ReportPeriodInfo(period_type=period, start_date=start_date, end_date=end_date),
                start_date,
                end_date,
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported report period: {period}",
        )

    def _calculate_metric_change(
        self,
        earliest_val: Optional[Decimal],
        latest_val: Optional[Decimal],
        earliest_dt: Optional[datetime],
        latest_dt: Optional[datetime],
    ) -> ProgressMetricChange:
        """Helper to calculate delta between earliest and latest values, preserving nulls."""
        if earliest_val is not None and latest_val is not None:
            change = latest_val - earliest_val
        else:
            change = None

        return ProgressMetricChange(
            earliest_value=earliest_val,
            latest_value=latest_val,
            change=change,
            earliest_date=earliest_dt,
            latest_date=latest_dt,
        )

    def _verify_client_access(self, db: Session, client_id: str, acting_user: User) -> User:
        """Enforces that the caller is authorized to view the requested client's reports."""
        # 1. Client self-scope: client can only view their own reports
        if acting_user.role == UserRole.CLIENT.value:
            if acting_user.id != client_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: clients can only view their own reports",
                )
            return acting_user

        client = db.get(User, client_id)
        if not client or client.role != UserRole.CLIENT.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client user not found",
            )

        # 2. Coach scope: coach can only view their actively assigned clients
        if acting_user.role == UserRole.COACH.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )

            asgn = db.scalar(
                select(CoachClientAssignment).where(
                    and_(
                        CoachClientAssignment.coach_id == acting_user.id,
                        CoachClientAssignment.client_id == client_id,
                        CoachClientAssignment.is_active == True,
                    )
                )
            )
            if not asgn:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: you are not assigned to this client",
                )
            return client

        # 3. Gym Admin scope: gym admin can view any client inside their tenant
        if acting_user.role == UserRole.GYM_ADMIN.value:
            if client.tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: client belongs to a different gym tenant",
                )
            return client

        # 4. Super Admin: platform-wide access allowed
        if acting_user.role == UserRole.SUPER_ADMIN.value:
            return client

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # --- Client Reports ---

    def get_client_overview(
        self,
        db: Session,
        client_id: str,
        acting_user: User,
    ) -> ClientOverviewReport:
        """Generate client overview summary report."""
        client = self._verify_client_access(db, client_id, acting_user)

        # Active coach assignment
        asgn = db.scalar(
            select(CoachClientAssignment)
            .options(selectinload(CoachClientAssignment.coach))
            .where(
                and_(
                    CoachClientAssignment.client_id == client_id,
                    CoachClientAssignment.is_active == True,
                )
            )
        )
        assigned_coach = None
        if asgn and asgn.coach:
            assigned_coach = UserSummary(
                id=asgn.coach.id,
                full_name=asgn.coach.full_name,
                email=asgn.coach.email,
                role=asgn.coach.role,
                tenant_id=asgn.coach.tenant_id,
                is_active=asgn.coach.is_active,
            )

        # Active training plan
        plan = db.scalar(
            select(TrainingPlan).where(
                and_(
                    TrainingPlan.client_id == client_id,
                    TrainingPlan.status == PlanStatus.ACTIVE.value,
                )
            )
        )
        active_plan = None
        if plan:
            active_plan = TrainingPlanBrief(id=plan.id, name=plan.name, status=plan.status)

        # Session stats
        session_stats = reports_repository.get_session_statistics(db, client_id=client_id)

        # Progress stats
        total_prog, _, latest_prog, _ = reports_repository.get_client_progress_data(db, client_id=client_id)
        latest_read = None
        if latest_prog:
            latest_read = ProgressRecordRead(
                id=latest_prog.id,
                tenant_id=latest_prog.tenant_id,
                client_id=latest_prog.client_id,
                coach_id=latest_prog.coach_id,
                recorded_at=latest_prog.recorded_at,
                weight_kg=latest_prog.weight_kg,
                body_fat_percentage=latest_prog.body_fat_percentage,
                chest_cm=latest_prog.chest_cm,
                waist_cm=latest_prog.waist_cm,
                hip_cm=latest_prog.hip_cm,
                arm_cm=latest_prog.arm_cm,
                thigh_cm=latest_prog.thigh_cm,
                notes=latest_prog.notes,
                training_session_id=latest_prog.training_session_id,
                training_plan_id=latest_prog.training_plan_id,
                created_at=latest_prog.created_at,
                updated_at=latest_prog.updated_at,
            )

        return ClientOverviewReport(
            client_id=client.id,
            client_name=client.full_name,
            client_email=client.email,
            assigned_coach=assigned_coach,
            active_training_plan=active_plan,
            session_stats=session_stats,
            total_progress_records=total_prog,
            latest_progress=latest_read,
        )

    def get_client_progress_report(
        self,
        db: Session,
        client_id: str,
        period: ReportPeriodType,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        acting_user: User,
    ) -> ClientProgressReport:
        """Generate client progress measurement report with deltas over period."""
        client = self._verify_client_access(db, client_id, acting_user)
        period_info, s, e = self.resolve_period_dates(period, start_date, end_date)

        total_records, earliest, latest, history = reports_repository.get_client_progress_data(
            db, client_id=client_id, start_date=s, end_date=e
        )

        e_dt = earliest.recorded_at if earliest else None
        l_dt = latest.recorded_at if latest else None

        weight_change = self._calculate_metric_change(
            earliest.weight_kg if earliest else None,
            latest.weight_kg if latest else None,
            e_dt,
            l_dt,
        )
        bf_change = self._calculate_metric_change(
            earliest.body_fat_percentage if earliest else None,
            latest.body_fat_percentage if latest else None,
            e_dt,
            l_dt,
        )
        chest_change = self._calculate_metric_change(
            earliest.chest_cm if earliest else None,
            latest.chest_cm if latest else None,
            e_dt,
            l_dt,
        )
        waist_change = self._calculate_metric_change(
            earliest.waist_cm if earliest else None,
            latest.waist_cm if latest else None,
            e_dt,
            l_dt,
        )
        hip_change = self._calculate_metric_change(
            earliest.hip_cm if earliest else None,
            latest.hip_cm if latest else None,
            e_dt,
            l_dt,
        )
        arm_change = self._calculate_metric_change(
            earliest.arm_cm if earliest else None,
            latest.arm_cm if latest else None,
            e_dt,
            l_dt,
        )
        thigh_change = self._calculate_metric_change(
            earliest.thigh_cm if earliest else None,
            latest.thigh_cm if latest else None,
            e_dt,
            l_dt,
        )

        chart_history = [
            ProgressChartPoint(
                recorded_at=rec.recorded_at,
                weight_kg=rec.weight_kg,
                body_fat_percentage=rec.body_fat_percentage,
                chest_cm=rec.chest_cm,
                waist_cm=rec.waist_cm,
                hip_cm=rec.hip_cm,
                arm_cm=rec.arm_cm,
                thigh_cm=rec.thigh_cm,
            )
            for rec in history
        ]

        return ClientProgressReport(
            client_id=client.id,
            client_name=client.full_name,
            period=period_info,
            total_records=total_records,
            weight=weight_change,
            body_fat_percentage=bf_change,
            chest_cm=chest_change,
            waist_cm=waist_change,
            hip_cm=hip_change,
            arm_cm=arm_change,
            thigh_cm=thigh_change,
            history=chart_history,
        )

    def get_client_training_report(
        self,
        db: Session,
        client_id: str,
        period: ReportPeriodType,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        acting_user: User,
    ) -> ClientTrainingReport:
        """Generate client session training report with completion rates and timeline."""
        client = self._verify_client_access(db, client_id, acting_user)
        period_info, s, e = self.resolve_period_dates(period, start_date, end_date)

        stats = reports_repository.get_session_statistics(
            db, client_id=client_id, start_date=s, end_date=e
        )
        activity = reports_repository.get_session_activity_by_date(
            db, client_id=client_id, start_date=s, end_date=e
        )

        return ClientTrainingReport(
            client_id=client.id,
            client_name=client.full_name,
            period=period_info,
            session_stats=stats,
            activity_by_date=activity,
        )

    # --- Coach Reports ---

    def get_coach_overview(
        self,
        db: Session,
        acting_user: User,
    ) -> CoachOverviewReport:
        """Generate coach performance overview."""
        if acting_user.role not in [UserRole.COACH.value, UserRole.GYM_ADMIN.value, UserRole.SUPER_ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your user role",
            )

        coach_id = acting_user.id
        total_asgn, act_asgn, total_p, act_p = reports_repository.get_coach_overview_counts(
            db, coach_id=coach_id, tenant_id=acting_user.tenant_id
        )
        session_stats = reports_repository.get_session_statistics(
            db, coach_id=coach_id, tenant_id=acting_user.tenant_id
        )

        return CoachOverviewReport(
            coach_id=acting_user.id,
            coach_name=acting_user.full_name,
            coach_email=acting_user.email,
            total_assigned_clients=total_asgn,
            active_assigned_clients=act_asgn,
            total_training_plans=total_p,
            active_training_plans=act_p,
            session_stats=session_stats,
        )

    def get_coach_clients(
        self,
        db: Session,
        acting_user: User,
        skip: int = 0,
        limit: int = 50,
    ) -> List[CoachClientSummary]:
        """Fetch list of clients assigned to coach with summarized performance indicators."""
        if acting_user.role not in [UserRole.COACH.value, UserRole.GYM_ADMIN.value, UserRole.SUPER_ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your user role",
            )

        return reports_repository.get_coach_clients_summary_list(
            db, coach_id=acting_user.id, skip=skip, limit=limit
        )

    # --- Gym Admin Reports ---

    def _resolve_target_tenant(
        self,
        db: Session,
        acting_user: User,
        tenant_id: Optional[str] = None,
    ) -> Tenant:
        """Resolves tenant context ensuring strict tenant boundary isolation."""
        if acting_user.role == UserRole.SUPER_ADMIN.value:
            target_id = tenant_id or acting_user.tenant_id
            if not target_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="tenant_id query parameter is required for platform super admin",
                )
        elif acting_user.role == UserRole.GYM_ADMIN.value:
            if not acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not associated with any gym tenant",
                )
            if tenant_id and tenant_id != acting_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant query rejected: you can only access your own gym tenant reports",
                )
            target_id = acting_user.tenant_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your user role",
            )

        tenant = db.get(Tenant, target_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gym tenant not found",
            )
        return tenant

    def get_gym_overview(
        self,
        db: Session,
        acting_user: User,
        tenant_id: Optional[str] = None,
    ) -> GymOverviewReport:
        """Tenant-level aggregated metrics."""
        tenant = self._resolve_target_tenant(db, acting_user, tenant_id)

        clients, coaches, active_asgns, total_p, act_p, prog = reports_repository.get_gym_overview_counts(
            db, tenant_id=tenant.id
        )
        session_stats = reports_repository.get_session_statistics(db, tenant_id=tenant.id)

        return GymOverviewReport(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            total_clients=clients,
            total_coaches=coaches,
            active_assignments=active_asgns,
            total_training_plans=total_p,
            active_training_plans=act_p,
            session_stats=session_stats,
            total_progress_records=prog,
        )

    def get_gym_clients(
        self,
        db: Session,
        acting_user: User,
        tenant_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[GymClientSummary]:
        """Tenant client activity table."""
        tenant = self._resolve_target_tenant(db, acting_user, tenant_id)
        return reports_repository.get_gym_clients_activity_list(
            db, tenant_id=tenant.id, skip=skip, limit=limit
        )

    def get_gym_coaches(
        self,
        db: Session,
        acting_user: User,
        tenant_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[GymCoachSummary]:
        """Tenant coach activity and completion performance table."""
        tenant = self._resolve_target_tenant(db, acting_user, tenant_id)
        return reports_repository.get_gym_coaches_activity_list(
            db, tenant_id=tenant.id, skip=skip, limit=limit
        )

    def get_gym_sessions(
        self,
        db: Session,
        acting_user: User,
        period: ReportPeriodType,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        tenant_id: Optional[str] = None,
    ) -> GymSessionReport:
        """Tenant session analytics with completion rate and date timeline."""
        tenant = self._resolve_target_tenant(db, acting_user, tenant_id)
        period_info, s, e = self.resolve_period_dates(period, start_date, end_date)

        stats = reports_repository.get_session_statistics(
            db, tenant_id=tenant.id, start_date=s, end_date=e
        )
        activity = reports_repository.get_session_activity_by_date(
            db, tenant_id=tenant.id, start_date=s, end_date=e
        )

        return GymSessionReport(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            period=period_info,
            session_stats=stats,
            activity_by_date=activity,
        )

    # --- Super Admin Platform Reports ---

    def get_platform_overview(
        self,
        db: Session,
        acting_user: User,
    ) -> PlatformOverviewReport:
        """Platform-wide system metrics for Super Admin."""
        if acting_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can access platform-wide overview reports",
            )

        gyms, users, cls, cos, gas, plans, asgns, prog, exercises = reports_repository.get_platform_overview_counts(db)
        session_stats = reports_repository.get_session_statistics(db)

        return PlatformOverviewReport(
            total_gyms=gyms,
            total_users=users,
            total_clients=cls,
            total_coaches=cos,
            total_gym_admins=gas,
            total_training_plans=plans,
            session_stats=session_stats,
            total_active_assignments=asgns,
            total_progress_records=prog,
            total_exercises=exercises,
        )

    def get_tenants_reports(
        self,
        db: Session,
        acting_user: User,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[TenantSummaryReport]:
        """Tenant audit report list for Super Admin."""
        if acting_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can access tenant summary reports",
            )

        return reports_repository.get_tenants_summary_list(db, search=search, skip=skip, limit=limit)


reports_service = ReportsService()
