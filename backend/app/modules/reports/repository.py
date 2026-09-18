from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy import select, func, case, and_, desc, asc
from sqlalchemy.orm import Session, selectinload

from app.modules.assignments.models import CoachClientAssignment
from app.modules.exercises.models import Exercise
from app.modules.progress.models import ProgressRecord
from app.modules.sessions.models import TrainingSession, SessionStatus
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import TrainingPlan, PlanStatus
from app.modules.users.models import User, UserRole
from app.modules.reports.schemas import (
    SessionStatistics,
    SessionDatePoint,
    ProgressMetricChange,
    ProgressChartPoint,
    CoachClientSummary,
    GymClientSummary,
    GymCoachSummary,
    TenantSummaryReport,
)


class ReportsRepository:
    """Repository handling SQL-level aggregation and reporting data retrieval."""

    def get_session_statistics(
        self,
        db: Session,
        tenant_id: Optional[str] = None,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> SessionStatistics:
        """Calculate session aggregates in a single optimized SQL query."""
        filters = []
        if tenant_id:
            filters.append(TrainingSession.tenant_id == tenant_id)
        if coach_id:
            filters.append(TrainingSession.coach_id == coach_id)
        if client_id:
            filters.append(TrainingSession.client_id == client_id)
        if start_date:
            filters.append(TrainingSession.scheduled_start >= start_date)
        if end_date:
            filters.append(TrainingSession.scheduled_start <= end_date)

        stmt = select(
            func.count(TrainingSession.id).label("total"),
            func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
            func.count(case((TrainingSession.status == SessionStatus.CANCELLED.value, 1))).label("cancelled"),
            func.count(case((TrainingSession.status == SessionStatus.NO_SHOW.value, 1))).label("no_show"),
            func.count(
                case(
                    (TrainingSession.status.in_([SessionStatus.SCHEDULED.value, SessionStatus.CONFIRMED.value]), 1)
                )
            ).label("scheduled"),
            func.count(case((TrainingSession.status == SessionStatus.IN_PROGRESS.value, 1))).label("in_progress"),
        )
        if filters:
            stmt = stmt.where(and_(*filters))

        row = db.execute(stmt).one()
        total = row.total or 0
        completed = row.completed or 0
        cancelled = row.cancelled or 0
        no_show = row.no_show or 0
        scheduled = row.scheduled or 0
        in_progress = row.in_progress or 0

        eligible_outcome = completed + cancelled + no_show
        completion_rate = (
            round((completed / eligible_outcome) * 100.0, 1) if eligible_outcome > 0 else 0.0
        )

        return SessionStatistics(
            total=total,
            completed=completed,
            cancelled=cancelled,
            no_show=no_show,
            scheduled=scheduled,
            in_progress=in_progress,
            eligible_outcome=eligible_outcome,
            completion_rate=completion_rate,
        )

    def get_session_activity_by_date(
        self,
        db: Session,
        tenant_id: Optional[str] = None,
        coach_id: Optional[str] = None,
        client_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[SessionDatePoint]:
        """Aggregate sessions grouped by calendar date."""
        filters = []
        if tenant_id:
            filters.append(TrainingSession.tenant_id == tenant_id)
        if coach_id:
            filters.append(TrainingSession.coach_id == coach_id)
        if client_id:
            filters.append(TrainingSession.client_id == client_id)
        if start_date:
            filters.append(TrainingSession.scheduled_start >= start_date)
        if end_date:
            filters.append(TrainingSession.scheduled_start <= end_date)

        date_col = func.to_char(TrainingSession.scheduled_start, "YYYY-MM-DD")
        stmt = (
            select(
                date_col.label("date_str"),
                func.count(TrainingSession.id).label("total"),
                func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((TrainingSession.status == SessionStatus.CANCELLED.value, 1))).label("cancelled"),
            )
            .group_by(date_col)
            .order_by(date_col.asc())
        )
        if filters:
            stmt = stmt.where(and_(*filters))

        rows = db.execute(stmt).all()
        return [
            SessionDatePoint(
                date=r.date_str,
                total=r.total,
                completed=r.completed,
                cancelled=r.cancelled,
            )
            for r in rows
        ]

    def get_client_progress_data(
        self,
        db: Session,
        client_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[int, Optional[ProgressRecord], Optional[ProgressRecord], List[ProgressRecord]]:
        """Retrieve total record count, earliest record, latest record, and chronological list within range."""
        filters = [ProgressRecord.client_id == client_id]
        if start_date:
            filters.append(ProgressRecord.recorded_at >= start_date)
        if end_date:
            filters.append(ProgressRecord.recorded_at <= end_date)

        where_clause = and_(*filters)

        # Count total in period
        count_stmt = select(func.count(ProgressRecord.id)).where(where_clause)
        total_records = db.scalar(count_stmt) or 0

        # Earliest
        earliest_stmt = select(ProgressRecord).where(where_clause).order_by(ProgressRecord.recorded_at.asc()).limit(1)
        earliest = db.scalar(earliest_stmt)

        # Latest
        latest_stmt = select(ProgressRecord).where(where_clause).order_by(ProgressRecord.recorded_at.desc()).limit(1)
        latest = db.scalar(latest_stmt)

        # Full history points in period
        history_stmt = select(ProgressRecord).where(where_clause).order_by(ProgressRecord.recorded_at.asc())
        history = list(db.scalars(history_stmt).all())

        return total_records, earliest, latest, history

    def get_coach_overview_counts(
        self,
        db: Session,
        coach_id: str,
        tenant_id: Optional[str] = None,
    ) -> Tuple[int, int, int, int]:
        """Returns (total_assigned_clients, active_assigned_clients, total_plans, active_plans)."""
        asgn_filters = [CoachClientAssignment.coach_id == coach_id]
        if tenant_id:
            asgn_filters.append(CoachClientAssignment.tenant_id == tenant_id)

        # Total and active assignments
        asgn_stmt = select(
            func.count(CoachClientAssignment.id).label("total"),
            func.count(case((CoachClientAssignment.is_active == True, 1))).label("active"),
        ).where(and_(*asgn_filters))
        asgn_row = db.execute(asgn_stmt).one()

        # Total and active training plans
        plan_filters = [TrainingPlan.coach_id == coach_id]
        if tenant_id:
            plan_filters.append(TrainingPlan.tenant_id == tenant_id)

        plan_stmt = select(
            func.count(TrainingPlan.id).label("total"),
            func.count(case((TrainingPlan.status == PlanStatus.ACTIVE.value, 1))).label("active"),
        ).where(and_(*plan_filters))
        plan_row = db.execute(plan_stmt).one()

        return (
            asgn_row.total or 0,
            asgn_row.active or 0,
            plan_row.total or 0,
            plan_row.active or 0,
        )

    def get_coach_clients_summary_list(
        self,
        db: Session,
        coach_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[CoachClientSummary]:
        """Fetch list of clients assigned to coach with session and progress summary data."""
        # Find all client assignments for this coach
        asgn_stmt = (
            select(CoachClientAssignment)
            .options(selectinload(CoachClientAssignment.client))
            .where(CoachClientAssignment.coach_id == coach_id)
            .order_by(CoachClientAssignment.is_active.desc(), CoachClientAssignment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        assignments = list(db.scalars(asgn_stmt).all())
        if not assignments:
            return []

        client_ids = [a.client_id for a in assignments]

        # Active training plans for these clients
        plans_stmt = select(TrainingPlan).where(
            and_(
                TrainingPlan.client_id.in_(client_ids),
                TrainingPlan.coach_id == coach_id,
                TrainingPlan.status == PlanStatus.ACTIVE.value,
            )
        )
        plans = list(db.scalars(plans_stmt).all())
        client_active_plan = {p.client_id: p.name for p in plans}

        # Session counts per client
        sess_stmt = (
            select(
                TrainingSession.client_id,
                func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
                func.count(
                    case(
                        (
                            TrainingSession.status.in_([SessionStatus.SCHEDULED.value, SessionStatus.CONFIRMED.value]),
                            1,
                        )
                    )
                ).label("upcoming"),
            )
            .where(
                and_(
                    TrainingSession.client_id.in_(client_ids),
                    TrainingSession.coach_id == coach_id,
                )
            )
            .group_by(TrainingSession.client_id)
        )
        sess_counts = {r.client_id: (r.completed or 0, r.upcoming or 0) for r in db.execute(sess_stmt).all()}

        # Latest progress record per client
        # Fetch records for these clients
        result = []
        for asgn in assignments:
            cid = asgn.client_id
            client_user = asgn.client
            completed_s, upcoming_s = sess_counts.get(cid, (0, 0))

            # Latest progress
            latest_prog_stmt = (
                select(ProgressRecord)
                .where(ProgressRecord.client_id == cid)
                .order_by(ProgressRecord.recorded_at.desc())
                .limit(1)
            )
            latest_prog = db.scalar(latest_prog_stmt)

            result.append(
                CoachClientSummary(
                    client_id=cid,
                    client_name=client_user.full_name if client_user else None,
                    email=client_user.email if client_user else "",
                    is_active_assignment=asgn.is_active,
                    active_plan_name=client_active_plan.get(cid),
                    sessions_completed=completed_s,
                    sessions_upcoming=upcoming_s,
                    last_progress_date=latest_prog.recorded_at if latest_prog else None,
                    latest_weight_kg=latest_prog.weight_kg if latest_prog else None,
                    latest_body_fat_percentage=latest_prog.body_fat_percentage if latest_prog else None,
                )
            )

        return result

    def get_gym_overview_counts(
        self,
        db: Session,
        tenant_id: str,
    ) -> Tuple[int, int, int, int, int, int]:
        """Returns (total_clients, total_coaches, active_assignments, total_plans, active_plans, total_progress_records)."""
        # User counts
        user_stmt = select(
            func.count(case((User.role == UserRole.CLIENT.value, 1))).label("clients"),
            func.count(case((User.role == UserRole.COACH.value, 1))).label("coaches"),
        ).where(and_(User.tenant_id == tenant_id, User.is_active == True))
        u_row = db.execute(user_stmt).one()

        # Active assignments
        asgn_stmt = select(func.count(CoachClientAssignment.id)).where(
            and_(CoachClientAssignment.tenant_id == tenant_id, CoachClientAssignment.is_active == True)
        )
        active_asgns = db.scalar(asgn_stmt) or 0

        # Plans
        plan_stmt = select(
            func.count(TrainingPlan.id).label("total"),
            func.count(case((TrainingPlan.status == PlanStatus.ACTIVE.value, 1))).label("active"),
        ).where(TrainingPlan.tenant_id == tenant_id)
        p_row = db.execute(plan_stmt).one()

        # Progress records
        prog_stmt = select(func.count(ProgressRecord.id)).where(ProgressRecord.tenant_id == tenant_id)
        total_prog = db.scalar(prog_stmt) or 0

        return (
            u_row.clients or 0,
            u_row.coaches or 0,
            active_asgns,
            p_row.total or 0,
            p_row.active or 0,
            total_prog,
        )

    def get_gym_clients_activity_list(
        self,
        db: Session,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[GymClientSummary]:
        """Fetch list of gym clients with activity aggregates."""
        clients_stmt = (
            select(User)
            .where(and_(User.tenant_id == tenant_id, User.role == UserRole.CLIENT.value))
            .order_by(User.full_name.asc(), User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        clients = list(db.scalars(clients_stmt).all())
        if not clients:
            return []

        client_ids = [c.id for c in clients]

        # Active coaches for these clients
        asgn_stmt = (
            select(CoachClientAssignment)
            .options(selectinload(CoachClientAssignment.coach))
            .where(
                and_(
                    CoachClientAssignment.client_id.in_(client_ids),
                    CoachClientAssignment.tenant_id == tenant_id,
                    CoachClientAssignment.is_active == True,
                )
            )
        )
        assignments = list(db.scalars(asgn_stmt).all())
        client_coach_map = {a.client_id: (a.coach.full_name if a.coach else None) for a in assignments}

        # Active plans
        plan_stmt = select(TrainingPlan).where(
            and_(
                TrainingPlan.client_id.in_(client_ids),
                TrainingPlan.tenant_id == tenant_id,
                TrainingPlan.status == PlanStatus.ACTIVE.value,
            )
        )
        plans = list(db.scalars(plan_stmt).all())
        client_plan_map = {p.client_id: p.name for p in plans}

        # Session counts
        sess_stmt = (
            select(
                TrainingSession.client_id,
                func.count(TrainingSession.id).label("total"),
                func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
                func.count(
                    case(
                        (
                            TrainingSession.status.in_([SessionStatus.SCHEDULED.value, SessionStatus.CONFIRMED.value]),
                            1,
                        )
                    )
                ).label("upcoming"),
            )
            .where(
                and_(
                    TrainingSession.client_id.in_(client_ids),
                    TrainingSession.tenant_id == tenant_id,
                )
            )
            .group_by(TrainingSession.client_id)
        )
        sess_map = {r.client_id: (r.total or 0, r.completed or 0, r.upcoming or 0) for r in db.execute(sess_stmt).all()}

        result = []
        for c in clients:
            tot, comp, upc = sess_map.get(c.id, (0, 0, 0))
            # Latest progress date
            latest_date_stmt = (
                select(func.max(ProgressRecord.recorded_at))
                .where(and_(ProgressRecord.client_id == c.id, ProgressRecord.tenant_id == tenant_id))
            )
            latest_date = db.scalar(latest_date_stmt)

            result.append(
                GymClientSummary(
                    client_id=c.id,
                    client_name=c.full_name,
                    email=c.email,
                    assigned_coach_name=client_coach_map.get(c.id),
                    active_plan_name=client_plan_map.get(c.id),
                    total_sessions=tot,
                    completed_sessions=comp,
                    upcoming_sessions=upc,
                    latest_progress_date=latest_date,
                )
            )
        return result

    def get_gym_coaches_activity_list(
        self,
        db: Session,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[GymCoachSummary]:
        """Fetch list of gym coaches with roster and session performance data."""
        coaches_stmt = (
            select(User)
            .where(and_(User.tenant_id == tenant_id, User.role == UserRole.COACH.value))
            .order_by(User.full_name.asc(), User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        coaches = list(db.scalars(coaches_stmt).all())
        if not coaches:
            return []

        coach_ids = [c.id for c in coaches]

        # Assignments count per coach
        asgn_stmt = (
            select(
                CoachClientAssignment.coach_id,
                func.count(CoachClientAssignment.id).label("total"),
                func.count(case((CoachClientAssignment.is_active == True, 1))).label("active"),
            )
            .where(
                and_(
                    CoachClientAssignment.coach_id.in_(coach_ids),
                    CoachClientAssignment.tenant_id == tenant_id,
                )
            )
            .group_by(CoachClientAssignment.coach_id)
        )
        asgn_map = {r.coach_id: (r.total or 0, r.active or 0) for r in db.execute(asgn_stmt).all()}

        # Plans count per coach
        plan_stmt = (
            select(
                TrainingPlan.coach_id,
                func.count(TrainingPlan.id).label("plans_count"),
            )
            .where(
                and_(
                    TrainingPlan.coach_id.in_(coach_ids),
                    TrainingPlan.tenant_id == tenant_id,
                )
            )
            .group_by(TrainingPlan.coach_id)
        )
        plan_map = {r.coach_id: r.plans_count or 0 for r in db.execute(plan_stmt).all()}

        # Session metrics per coach
        sess_stmt = (
            select(
                TrainingSession.coach_id,
                func.count(TrainingSession.id).label("total"),
                func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((TrainingSession.status == SessionStatus.CANCELLED.value, 1))).label("cancelled"),
                func.count(case((TrainingSession.status == SessionStatus.NO_SHOW.value, 1))).label("no_show"),
                func.count(
                    case(
                        (
                            TrainingSession.status.in_([SessionStatus.SCHEDULED.value, SessionStatus.CONFIRMED.value]),
                            1,
                        )
                    )
                ).label("upcoming"),
            )
            .where(
                and_(
                    TrainingSession.coach_id.in_(coach_ids),
                    TrainingSession.tenant_id == tenant_id,
                )
            )
            .group_by(TrainingSession.coach_id)
        )
        sess_map = {r.coach_id: r for r in db.execute(sess_stmt).all()}

        result = []
        for c in coaches:
            tot_asgn, act_asgn = asgn_map.get(c.id, (0, 0))
            plans_cnt = plan_map.get(c.id, 0)
            s_row = sess_map.get(c.id)

            total_s = s_row.total if s_row else 0
            comp_s = s_row.completed if s_row else 0
            canc_s = s_row.cancelled if s_row else 0
            noshow_s = s_row.no_show if s_row else 0
            upc_s = s_row.upcoming if s_row else 0

            eligible = comp_s + canc_s + noshow_s
            rate = round((comp_s / eligible) * 100.0, 1) if eligible > 0 else 0.0

            result.append(
                GymCoachSummary(
                    coach_id=c.id,
                    coach_name=c.full_name,
                    email=c.email,
                    assigned_clients_count=tot_asgn,
                    active_clients_count=act_asgn,
                    training_plans_count=plans_cnt,
                    total_sessions=total_s,
                    completed_sessions=comp_s,
                    upcoming_sessions=upc_s,
                    completion_rate=rate,
                )
            )

        return result

    def get_platform_overview_counts(
        self,
        db: Session,
    ) -> Tuple[int, int, int, int, int, int, int, int, int]:
        """Platform-wide totals: (gyms, users, clients, coaches, gym_admins, plans, active_asgns, prog_records, exercises)."""
        # Tenants
        gyms = db.scalar(select(func.count(Tenant.id)).where(Tenant.is_active == True)) or 0

        # Users by role
        u_stmt = select(
            func.count(User.id).label("total_users"),
            func.count(case((User.role == UserRole.CLIENT.value, 1))).label("clients"),
            func.count(case((User.role == UserRole.COACH.value, 1))).label("coaches"),
            func.count(case((User.role == UserRole.GYM_ADMIN.value, 1))).label("gym_admins"),
        )
        u_row = db.execute(u_stmt).one()

        plans = db.scalar(select(func.count(TrainingPlan.id))) or 0
        asgns = db.scalar(select(func.count(CoachClientAssignment.id)).where(CoachClientAssignment.is_active == True)) or 0
        prog = db.scalar(select(func.count(ProgressRecord.id))) or 0
        exercises = db.scalar(select(func.count(Exercise.id)).where(Exercise.is_active == True)) or 0

        return (
            gyms,
            u_row.total_users or 0,
            u_row.clients or 0,
            u_row.coaches or 0,
            u_row.gym_admins or 0,
            plans,
            asgns,
            prog,
            exercises,
        )

    def get_tenants_summary_list(
        self,
        db: Session,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[TenantSummaryReport]:
        """Fetch list of gym tenants with platform audit numbers."""
        stmt = select(Tenant)
        if search:
            stmt = stmt.where(Tenant.name.ilike(f"%{search}%") | Tenant.slug.ilike(f"%{search}%"))
        stmt = stmt.order_by(Tenant.created_at.desc()).offset(skip).limit(limit)
        tenants = list(db.scalars(stmt).all())
        if not tenants:
            return []

        tenant_ids = [t.id for t in tenants]

        # Users breakdown per tenant
        u_stmt = (
            select(
                User.tenant_id,
                func.count(User.id).label("total_users"),
                func.count(case((User.role == UserRole.CLIENT.value, 1))).label("clients"),
                func.count(case((User.role == UserRole.COACH.value, 1))).label("coaches"),
            )
            .where(User.tenant_id.in_(tenant_ids))
            .group_by(User.tenant_id)
        )
        u_map = {r.tenant_id: r for r in db.execute(u_stmt).all()}

        # Plans per tenant
        p_stmt = (
            select(TrainingPlan.tenant_id, func.count(TrainingPlan.id).label("plans"))
            .where(TrainingPlan.tenant_id.in_(tenant_ids))
            .group_by(TrainingPlan.tenant_id)
        )
        p_map = {r.tenant_id: r.plans or 0 for r in db.execute(p_stmt).all()}

        # Sessions per tenant
        s_stmt = (
            select(
                TrainingSession.tenant_id,
                func.count(TrainingSession.id).label("total"),
                func.count(case((TrainingSession.status == SessionStatus.COMPLETED.value, 1))).label("completed"),
            )
            .where(TrainingSession.tenant_id.in_(tenant_ids))
            .group_by(TrainingSession.tenant_id)
        )
        s_map = {r.tenant_id: (r.total or 0, r.completed or 0) for r in db.execute(s_stmt).all()}

        # Active assignments
        a_stmt = (
            select(
                CoachClientAssignment.tenant_id,
                func.count(CoachClientAssignment.id).label("active_asgns"),
            )
            .where(
                and_(
                    CoachClientAssignment.tenant_id.in_(tenant_ids),
                    CoachClientAssignment.is_active == True,
                )
            )
            .group_by(CoachClientAssignment.tenant_id)
        )
        a_map = {r.tenant_id: r.active_asgns or 0 for r in db.execute(a_stmt).all()}

        result = []
        for t in tenants:
            u_row = u_map.get(t.id)
            tot_u = u_row.total_users if u_row else 0
            cls = u_row.clients if u_row else 0
            cos = u_row.coaches if u_row else 0
            pln = p_map.get(t.id, 0)
            tot_s, comp_s = s_map.get(t.id, (0, 0))
            act_a = a_map.get(t.id, 0)

            result.append(
                TenantSummaryReport(
                    tenant_id=t.id,
                    name=t.name,
                    slug=t.slug,
                    is_active=t.is_active,
                    total_users=tot_u,
                    total_clients=cls,
                    total_coaches=cos,
                    total_training_plans=pln,
                    total_sessions=tot_s,
                    completed_sessions=comp_s,
                    active_assignments=act_a,
                )
            )

        return result


reports_repository = ReportsRepository()
