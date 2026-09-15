"""
FitSphere - Schedule & Sessions Domain Automated Verification Suite
Explicitly tests all 24 required scenarios:

 1. Coach creates a session for an actively assigned client (201 Created)
 2. Coach cannot create a session for an unassigned client (400 Bad Request)
 3. Client cannot create a session (403 Forbidden)
 4. Gym Admin can create a session inside their tenant (201 Created)
 5. Cross-tenant session creation is rejected (400 / 403)
 6. Coach cannot create a session for another coach (403 Forbidden)
 7. Client sees only their own sessions
 8. Coach sees only their own sessions
 9. Gym Admin sees only their tenant sessions
10. Super Admin can view platform sessions
11. Inactive coach is rejected (400 Bad Request)
12. Inactive client is rejected (400 Bad Request)
13. Invalid coach role is rejected (400 Bad Request)
14. Invalid client role is rejected (400 Bad Request)
15. Invalid time range is rejected (400 Bad Request)
16. Invalid training plan reference is rejected (400 Bad Request)
17. Invalid workout day reference is rejected (400 Bad Request)
18. Overlapping coach sessions are rejected (400 Bad Request)
19. Valid status transitions succeed (scheduled -> confirmed -> in_progress -> completed)
20. Invalid status transitions are rejected (terminal and invalid next states)
21. Client mutation attempts return 403 Forbidden
22. Sub-resource and tenant isolation are enforced
23. Direct service-layer authorization is enforced
24. Database constraint & cascading behavior verified
"""

import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.sessions.models import (
    SessionStatus,
    SessionType,
    TrainingSession,
)
from app.modules.sessions.schemas import (
    TrainingSessionCreate,
    TrainingSessionUpdate,
)
from app.modules.sessions.service import training_session_service
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import (
    PlanStatus,
    TrainingPlan,
    WorkoutDay,
)
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"sess_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Schedule & Sessions test suite with prefix: {prefix}")

    try:
        # ---------------------------------------------------------------------
        # Setup: Two Gyms (Gym A and Gym B)
        # ---------------------------------------------------------------------
        gym_a = Tenant(
            id=str(uuid.uuid4()),
            name=f"Gym A {prefix}",
            slug=f"gym-a-{prefix}",
            is_active=True,
        )
        gym_b = Tenant(
            id=str(uuid.uuid4()),
            name=f"Gym B {prefix}",
            slug=f"gym-b-{prefix}",
            is_active=True,
        )
        db.add_all([gym_a, gym_b])
        db.commit()

        # Users Setup
        # Super Admin
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                role=UserRole.SUPER_ADMIN.value,
                full_name="Super Admin",
            ),
        )

        # Gym A Admin
        gym_a_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_a@fitsphere.test",
                password="Password123!",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=gym_a.id,
                full_name="Admin Gym A",
            ),
        )

        # Gym B Admin
        gym_b_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_b@fitsphere.test",
                password="Password123!",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=gym_b.id,
                full_name="Admin Gym B",
            ),
        )

        # Gym A Coaches
        coach_a1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Coach Mike",
            ),
        )
        coach_a2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Coach Sarah",
            ),
        )

        # Gym B Coach
        coach_b1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_b1@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_b.id,
                full_name="Coach Dave",
            ),
        )

        # Gym A Clients
        client_a1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client Alex",
            ),
        )
        client_a2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client Emma",
            ),
        )

        # Gym B Client
        client_b1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_b1@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_b.id,
                full_name="Client John",
            ),
        )

        # Inactive users for negative tests
        inactive_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_inactive_coach@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Inactive Coach",
            ),
        )
        inactive_coach.is_active = False

        inactive_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_inactive_client@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Inactive Client",
            ),
        )
        inactive_client.is_active = False

        db.commit()

        # Assignments Setup:
        # Coach A1 -> Client A1 (Active)
        assign_a1_a1 = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a1.id,
            client_id=client_a1.id,
            is_active=True,
        )
        # Coach B1 -> Client B1 (Active)
        assign_b1_b1 = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_b.id,
            coach_id=coach_b1.id,
            client_id=client_b1.id,
            is_active=True,
        )
        db.add_all([assign_a1_a1, assign_b1_b1])
        db.commit()

        # Training Plan & Workout Day Setup for Gym A Coach A1 & Client A1
        plan_a1 = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a1.id,
            client_id=client_a1.id,
            name="8-Week Hypertrophy",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan_a1)
        db.commit()

        day_a1 = WorkoutDay(
            id=str(uuid.uuid4()),
            training_plan_id=plan_a1.id,
            tenant_id=gym_a.id,
            name="Day 1: Upper Body Push",
            order_index=0,
        )
        db.add(day_a1)
        db.commit()

        # Plan in Gym B for cross-tenant tests
        plan_b1 = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_b.id,
            coach_id=coach_b1.id,
            client_id=client_b1.id,
            name="Endurance Protocol",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan_b1)
        db.commit()

        day_b1 = WorkoutDay(
            id=str(uuid.uuid4()),
            training_plan_id=plan_b1.id,
            tenant_id=gym_b.id,
            name="Cardio Intervals",
            order_index=0,
        )
        db.add(day_b1)
        db.commit()

        print("[+] Test environment initialized successfully.")

        now = datetime.now(timezone.utc).replace(microsecond=0)
        t_base = now + timedelta(days=1)

        # ---------------------------------------------------------------------
        # Test 1: Coach creates session for assigned client (201)
        # ---------------------------------------------------------------------
        start_1 = t_base + timedelta(hours=10)
        end_1 = start_1 + timedelta(hours=1)
        payload_1 = {
            "client_id": client_a1.id,
            "scheduled_start": start_1.isoformat(),
            "scheduled_end": end_1.isoformat(),
            "session_type": "personal_training",
            "notes": "Introductory assessment and baseline measurements",
            "training_plan_id": plan_a1.id,
            "workout_day_id": day_a1.id,
        }
        res_1 = client.post(
            "/api/v1/sessions/",
            json=payload_1,
            headers=auth_header(coach_a1.id),
        )
        assert res_1.status_code == 201, f"Expected 201, got {res_1.status_code}: {res_1.text}"
        session_1 = res_1.json()
        assert session_1["coach_id"] == coach_a1.id
        assert session_1["client_id"] == client_a1.id
        assert session_1["status"] == "scheduled"
        assert session_1["training_plan"]["id"] == plan_a1.id
        assert session_1["workout_day"]["id"] == day_a1.id
        print("  [PASS] 1. Coach creates session for assigned client (201 Created)")

        # ---------------------------------------------------------------------
        # Test 2: Coach cannot create session for unassigned client (400)
        # ---------------------------------------------------------------------
        start_2 = t_base + timedelta(hours=12)
        end_2 = start_2 + timedelta(hours=1)
        res_2 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a2.id,  # client_a2 has no assignment with coach_a1
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_2.status_code == 400, f"Expected 400, got {res_2.status_code}: {res_2.text}"
        assert "Active coach-client assignment required" in res_2.text
        print("  [PASS] 2. Coach cannot create session for unassigned client (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 3: Client cannot create a session (403)
        # ---------------------------------------------------------------------
        res_3 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "coach_id": coach_a1.id,
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(client_a1.id),
        )
        assert res_3.status_code == 403, f"Expected 403, got {res_3.status_code}: {res_3.text}"
        print("  [PASS] 3. Client cannot create a session (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Test 4: Gym Admin can create a session inside their tenant (201)
        # ---------------------------------------------------------------------
        start_4 = t_base + timedelta(hours=14)
        end_4 = start_4 + timedelta(hours=1)
        res_4 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": coach_a1.id,
                "client_id": client_a1.id,
                "scheduled_start": start_4.isoformat(),
                "scheduled_end": end_4.isoformat(),
                "session_type": "consultation",
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_4.status_code == 201, f"Expected 201, got {res_4.status_code}: {res_4.text}"
        session_4 = res_4.json()
        assert session_4["tenant_id"] == gym_a.id
        print("  [PASS] 4. Gym Admin can create a session inside their tenant (201 Created)")

        # ---------------------------------------------------------------------
        # Test 5: Cross-tenant session creation is rejected (400/403)
        # ---------------------------------------------------------------------
        # Gym A admin trying to schedule Gym B users
        res_5a = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": coach_b1.id,
                "client_id": client_b1.id,
                "scheduled_start": start_4.isoformat(),
                "scheduled_end": end_4.isoformat(),
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_5a.status_code == 403, f"Expected 403, got {res_5a.status_code}: {res_5a.text}"

        # Coach in Gym A trying to schedule with client in Gym B
        res_5b = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_b1.id,
                "scheduled_start": start_4.isoformat(),
                "scheduled_end": end_4.isoformat(),
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_5b.status_code == 400, f"Expected 400, got {res_5b.status_code}: {res_5b.text}"
        print("  [PASS] 5. Cross-tenant session creation is rejected (400/403)")

        # ---------------------------------------------------------------------
        # Test 6: Coach cannot create a session for another coach (403)
        # ---------------------------------------------------------------------
        res_6 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": coach_a2.id,  # specifying different coach
                "client_id": client_a1.id,
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_6.status_code == 403, f"Expected 403, got {res_6.status_code}: {res_6.text}"
        print("  [PASS] 6. Coach cannot create a session for another coach (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Test 7: Client sees only their own sessions
        # ---------------------------------------------------------------------
        res_7 = client.get("/api/v1/sessions/", headers=auth_header(client_a1.id))
        assert res_7.status_code == 200
        client_sessions = res_7.json()
        assert all(s["client_id"] == client_a1.id for s in client_sessions)
        assert any(s["id"] == session_1["id"] for s in client_sessions)
        print("  [PASS] 7. Client sees only their own sessions")

        # ---------------------------------------------------------------------
        # Test 8: Coach sees only their own sessions
        # ---------------------------------------------------------------------
        res_8 = client.get("/api/v1/sessions/", headers=auth_header(coach_a1.id))
        assert res_8.status_code == 200
        coach_sessions = res_8.json()
        assert all(s["coach_id"] == coach_a1.id for s in coach_sessions)
        print("  [PASS] 8. Coach sees only their own sessions")

        # ---------------------------------------------------------------------
        # Test 9: Gym Admin sees only their tenant sessions
        # ---------------------------------------------------------------------
        res_9 = client.get("/api/v1/sessions/", headers=auth_header(gym_a_admin.id))
        assert res_9.status_code == 200
        gym_a_sessions = res_9.json()
        assert all(s["tenant_id"] == gym_a.id for s in gym_a_sessions)
        assert len(gym_a_sessions) >= 2
        print("  [PASS] 9. Gym Admin sees only their tenant sessions")

        # ---------------------------------------------------------------------
        # Test 10: Super Admin can view platform sessions
        # ---------------------------------------------------------------------
        res_10 = client.get("/api/v1/sessions/", headers=auth_header(super_admin.id))
        assert res_10.status_code == 200
        all_sessions = res_10.json()
        assert len(all_sessions) >= 2
        print("  [PASS] 10. Super Admin can view platform sessions")

        # ---------------------------------------------------------------------
        # Test 11: Inactive coach is rejected (400)
        # ---------------------------------------------------------------------
        res_11 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": inactive_coach.id,
                "client_id": client_a1.id,
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_11.status_code == 400, f"Expected 400, got {res_11.status_code}: {res_11.text}"
        assert "inactive" in res_11.text
        print("  [PASS] 11. Inactive coach is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 12: Inactive client is rejected (400)
        # ---------------------------------------------------------------------
        res_12 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": coach_a1.id,
                "client_id": inactive_client.id,
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_12.status_code == 400, f"Expected 400, got {res_12.status_code}: {res_12.text}"
        assert "inactive" in res_12.text
        print("  [PASS] 12. Inactive client is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 13: Invalid coach role is rejected (400)
        # ---------------------------------------------------------------------
        res_13 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": client_a2.id,  # client supplied as coach
                "client_id": client_a1.id,
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_13.status_code == 400, f"Expected 400, got {res_13.status_code}: {res_13.text}"
        assert "is not a coach" in res_13.text
        print("  [PASS] 13. Invalid coach role is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 14: Invalid client role is rejected (400)
        # ---------------------------------------------------------------------
        res_14 = client.post(
            "/api/v1/sessions/",
            json={
                "coach_id": coach_a1.id,
                "client_id": coach_a2.id,  # coach supplied as client
                "scheduled_start": start_2.isoformat(),
                "scheduled_end": end_2.isoformat(),
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res_14.status_code == 400, f"Expected 400, got {res_14.status_code}: {res_14.text}"
        assert "is not a client" in res_14.text
        print("  [PASS] 14. Invalid client role is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 15: Invalid time range is rejected (400)
        # ---------------------------------------------------------------------
        res_15 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "scheduled_start": end_1.isoformat(),
                "scheduled_end": start_1.isoformat(),  # end before start
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_15.status_code == 400, f"Expected 400, got {res_15.status_code}: {res_15.text}"
        assert "scheduled_end must be later than scheduled_start" in res_15.text
        print("  [PASS] 15. Invalid time range is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 16: Invalid training plan reference is rejected (400)
        # ---------------------------------------------------------------------
        start_16 = t_base + timedelta(hours=16)
        end_16 = start_16 + timedelta(hours=1)
        res_16 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "scheduled_start": start_16.isoformat(),
                "scheduled_end": end_16.isoformat(),
                "training_plan_id": plan_b1.id,  # Gym B plan for Gym A session
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_16.status_code == 400, f"Expected 400, got {res_16.status_code}: {res_16.text}"
        print("  [PASS] 16. Invalid training plan reference is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 17: Invalid workout day reference is rejected (400)
        # ---------------------------------------------------------------------
        res_17 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "scheduled_start": start_16.isoformat(),
                "scheduled_end": end_16.isoformat(),
                "training_plan_id": plan_a1.id,
                "workout_day_id": day_b1.id,  # Gym B workout day
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_17.status_code == 400, f"Expected 400, got {res_17.status_code}: {res_17.text}"
        print("  [PASS] 17. Invalid workout day reference is rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 18: Overlapping coach sessions are rejected (400)
        # ---------------------------------------------------------------------
        # session_1 was booked at start_1 to end_1. Try booking an overlap:
        overlap_start = start_1 + timedelta(minutes=30)
        overlap_end = overlap_start + timedelta(hours=1)
        res_18 = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "scheduled_start": overlap_start.isoformat(),
                "scheduled_end": overlap_end.isoformat(),
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_18.status_code == 400, f"Expected 400, got {res_18.status_code}: {res_18.text}"
        assert "Schedule conflict" in res_18.text
        print("  [PASS] 18. Overlapping coach sessions are rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 19: Valid status transitions succeed
        # scheduled -> confirmed -> in_progress -> completed
        # ---------------------------------------------------------------------
        s_id = session_1["id"]
        # Confirm
        res_19a = client.post(f"/api/v1/sessions/{s_id}/confirm", headers=auth_header(coach_a1.id))
        assert res_19a.status_code == 200
        assert res_19a.json()["status"] == "confirmed"

        # Start
        res_19b = client.post(f"/api/v1/sessions/{s_id}/start", headers=auth_header(coach_a1.id))
        assert res_19b.status_code == 200
        assert res_19b.json()["status"] == "in_progress"

        # Complete
        res_19c = client.post(f"/api/v1/sessions/{s_id}/complete", headers=auth_header(coach_a1.id))
        assert res_19c.status_code == 200
        assert res_19c.json()["status"] == "completed"
        print("  [PASS] 19. Valid status transitions succeed (scheduled -> confirmed -> in_progress -> completed)")

        # ---------------------------------------------------------------------
        # Test 20: Invalid status transitions are rejected (400)
        # Session is completed; attempting further transition or invalid step
        # ---------------------------------------------------------------------
        res_20a = client.post(f"/api/v1/sessions/{s_id}/confirm", headers=auth_header(coach_a1.id))
        assert res_20a.status_code == 400
        assert "Cannot transition session from terminal status" in res_20a.text

        # Create another session to test invalid direct skip (scheduled -> completed)
        start_20 = t_base + timedelta(hours=18)
        end_20 = start_20 + timedelta(hours=1)
        res_fresh = client.post(
            "/api/v1/sessions/",
            json={
                "client_id": client_a1.id,
                "scheduled_start": start_20.isoformat(),
                "scheduled_end": end_20.isoformat(),
            },
            headers=auth_header(coach_a1.id),
        )
        assert res_fresh.status_code == 201
        fresh_id = res_fresh.json()["id"]

        # Attempt scheduled directly to complete (not in allowed transitions)
        res_20b = client.post(f"/api/v1/sessions/{fresh_id}/complete", headers=auth_header(coach_a1.id))
        assert res_20b.status_code == 400
        assert "Invalid status transition" in res_20b.text
        print("  [PASS] 20. Invalid status transitions are rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Test 21: Client mutation attempts return 403 Forbidden
        # ---------------------------------------------------------------------
        res_21a = client.patch(
            f"/api/v1/sessions/{fresh_id}",
            json={"notes": "Hacked notes"},
            headers=auth_header(client_a1.id),
        )
        assert res_21a.status_code == 403, f"Expected 403, got {res_21a.status_code}"

        res_21b = client.post(f"/api/v1/sessions/{fresh_id}/confirm", headers=auth_header(client_a1.id))
        assert res_21b.status_code == 403, f"Expected 403, got {res_21b.status_code}"

        res_21c = client.post(f"/api/v1/sessions/{fresh_id}/cancel", headers=auth_header(client_a1.id))
        assert res_21c.status_code == 403, f"Expected 403, got {res_21c.status_code}"
        print("  [PASS] 21. Client mutation attempts return 403 Forbidden")

        # ---------------------------------------------------------------------
        # Test 22: Sub-resource and tenant isolation are enforced
        # ---------------------------------------------------------------------
        # Coach Dave (Gym B) cannot get session in Gym A
        res_22a = client.get(f"/api/v1/sessions/{fresh_id}", headers=auth_header(coach_b1.id))
        assert res_22a.status_code == 403

        # Client Emma (Gym A, but not assigned to this session) cannot view fresh_id (assigned to Alex)
        res_22b = client.get(f"/api/v1/sessions/{fresh_id}", headers=auth_header(client_a2.id))
        assert res_22b.status_code == 403
        print("  [PASS] 22. Sub-resource and tenant isolation are enforced")

        # ---------------------------------------------------------------------
        # Test 23: Direct service-layer authorization is enforced
        # ---------------------------------------------------------------------
        # Calling service directly as client raises 403
        try:
            training_session_service.create(
                db,
                obj_in=TrainingSessionCreate(
                    client_id=client_a1.id,
                    coach_id=coach_a1.id,
                    scheduled_start=start_20,
                    scheduled_end=end_20,
                ),
                acting_user=client_a1,
            )
            assert False, "Service should have raised 403"
        except HTTPException as exc:
            assert exc.status_code == 403

        # Calling transition status directly as client raises 403
        try:
            training_session_service.confirm(db, id=fresh_id, acting_user=client_a1)
            assert False, "Service should have raised 403"
        except HTTPException as exc:
            assert exc.status_code == 403
        print("  [PASS] 23. Direct service-layer authorization is enforced")

        # ---------------------------------------------------------------------
        # Test 24: Database constraint & cascading behavior
        # ---------------------------------------------------------------------
        # When training_plan is deleted, session.training_plan_id becomes NULL (SET NULL)
        # Create a disposable session with a disposable plan
        disp_plan = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a1.id,
            client_id=client_a1.id,
            name="Disposable Plan",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(disp_plan)
        db.commit()

        start_24 = t_base + timedelta(hours=20)
        end_24 = start_24 + timedelta(hours=1)
        disp_session = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a1.id,
            client_id=client_a1.id,
            training_plan_id=disp_plan.id,
            scheduled_start=start_24,
            scheduled_end=end_24,
            status=SessionStatus.SCHEDULED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        db.add(disp_session)
        db.commit()

        # Delete the plan
        db.delete(disp_plan)
        db.commit()

        # Refresh session
        db.refresh(disp_session)
        assert disp_session.training_plan_id is None, "Session training_plan_id should be SET NULL"
        print("  [PASS] 24. Database foreign key cascading behavior verified (ON DELETE SET NULL)")

        print("\n=======================================================")
        print(">>> ALL 24 SCHEDULE & SESSIONS TESTS PASSED! <<<")
        print("=======================================================")

    finally:
        # Cleanup
        try:
            db.query(TrainingSession).filter(TrainingSession.tenant_id.in_([gym_a.id, gym_b.id])).delete(synchronize_session=False)
            db.query(WorkoutDay).filter(WorkoutDay.tenant_id.in_([gym_a.id, gym_b.id])).delete(synchronize_session=False)
            db.query(TrainingPlan).filter(TrainingPlan.tenant_id.in_([gym_a.id, gym_b.id])).delete(synchronize_session=False)
            db.query(CoachClientAssignment).filter(CoachClientAssignment.tenant_id.in_([gym_a.id, gym_b.id])).delete(synchronize_session=False)
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.id.in_([gym_a.id, gym_b.id])).delete(synchronize_session=False)
            db.commit()
            print("[*] Test data cleaned up successfully.")
        except Exception as e:
            print(f"[!] Cleanup error: {e}")
            db.rollback()
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
