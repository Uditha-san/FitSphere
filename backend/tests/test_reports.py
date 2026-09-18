"""
FitSphere - Reports & Analytics Domain Automated Verification Suite
Tests all required reporting scenarios:

 1. Client can access own overview report (200 OK)
 2. Client can access own progress report with metric deltas (200 OK)
 3. Client can access own training report with session stats (200 OK)
 4. Client cannot access another client's overview report (403 Forbidden)
 5. Client cannot access another client's progress report (403 Forbidden)
 6. Client cannot access another client's training report (403 Forbidden)
 7. Client cannot access coach overview report (403 Forbidden)
 8. Client cannot access gym overview report (403 Forbidden)
 9. Client cannot access super admin overview report (403 Forbidden)
 10. Coach can access coach overview report (200 OK)
 11. Coach can access coach assigned clients list (200 OK)
 12. Coach can access assigned client's overview report (200 OK)
 13. Coach cannot access unassigned client report in same gym (403 Forbidden)
 14. Coach cannot access client in another gym tenant (403 Forbidden)
 15. Coach cannot access gym overview report (403 Forbidden)
 16. Gym Admin can access gym overview report (200 OK)
 17. Gym Admin can access gym clients report (200 OK)
 18. Gym Admin can access gym coaches report (200 OK)
 19. Gym Admin can access gym sessions report (200 OK)
 20. Gym Admin cannot access another gym's report by specifying another tenant_id (403 Forbidden)
 21. Super Admin can access platform overview report (200 OK)
 22. Super Admin can access all gyms summary report (200 OK)
 23. Super Admin can access specific gym report (200 OK)
 24. Date period filtering: last_7_days, last_30_days, last_90_days, all_time (200 OK)
 25. Custom date period with valid range (start_date <= end_date) (200 OK)
 26. Custom date period with invalid range (start_date > end_date) rejected (400 Bad Request)
 27. Custom date period missing start_date or end_date rejected (400 Bad Request)
 28. Session completion rate calculation handles zero denominator correctly (0.0)
 29. Progress metric change calculation: starting, latest, delta (latest - earliest)
 30. Missing metric values in progress records correctly produce None for delta
 31. Pagination parameters (skip, limit) work properly on list endpoints
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.progress.models import ProgressRecord
from app.modules.sessions.models import SessionStatus, SessionType, TrainingSession
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import PlanStatus, TrainingPlan
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"rep_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Reports & Analytics test suite with prefix: {prefix}")

    try:
        # ---------------------------------------------------------------------
        # Setup: Two Tenants (Gym A and Gym B)
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
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                role=UserRole.SUPER_ADMIN.value,
                full_name="Super Admin",
            ),
        )

        gym_a_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_a@fitsphere.test",
                password="Password123!",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=gym_a.id,
                full_name="Gym A Admin",
            ),
        )

        coach_a = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Coach A",
            ),
        )

        client_a = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client A",
            ),
        )

        client_a_unassigned = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a_unassigned@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client A Unassigned",
            ),
        )

        # Gym B User
        client_b = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_b@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_b.id,
                full_name="Client B",
            ),
        )

        # Active Assignment: Coach A -> Client A in Gym A
        assignment_a = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            is_active=True,
        )
        db.add(assignment_a)

        # Training Plan for Client A
        plan_a = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            name="Client A Hypertrophy",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan_a)

        # Training Sessions for Client A
        now = datetime.now(timezone.utc)
        s1 = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            training_plan_id=plan_a.id,
            scheduled_start=now - timedelta(days=5),
            scheduled_end=now - timedelta(days=5) + timedelta(hours=1),
            status=SessionStatus.COMPLETED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        s2 = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            training_plan_id=plan_a.id,
            scheduled_start=now - timedelta(days=2),
            scheduled_end=now - timedelta(days=2) + timedelta(hours=1),
            status=SessionStatus.CANCELLED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        s3 = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            training_plan_id=plan_a.id,
            scheduled_start=now + timedelta(days=2),
            scheduled_end=now + timedelta(days=2) + timedelta(hours=1),
            status=SessionStatus.SCHEDULED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        db.add_all([s1, s2, s3])

        # Progress Records for Client A
        # Earlier record (10 days ago): 80.0 kg, 18.0% body fat, waist 85.0
        p1 = ProgressRecord(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            client_id=client_a.id,
            coach_id=coach_a.id,
            recorded_at=now - timedelta(days=10),
            weight_kg=Decimal("80.00"),
            body_fat_percentage=Decimal("18.00"),
            waist_cm=Decimal("85.00"),
            chest_cm=None,  # missing earlier
        )
        # Later record (1 day ago): 78.5 kg, 17.2% body fat, chest 100.0 (no waist recorded)
        p2 = ProgressRecord(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            client_id=client_a.id,
            coach_id=coach_a.id,
            recorded_at=now - timedelta(days=1),
            weight_kg=Decimal("78.50"),
            body_fat_percentage=Decimal("17.20"),
            waist_cm=None,  # missing later
            chest_cm=Decimal("100.00"),
        )
        db.add_all([p1, p2])
        db.commit()

        # ---------------------------------------------------------------------
        # 1. Client can access own overview report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/overview", headers=auth_header(client_a.id))
        assert r.status_code == 200, f"Test 1 failed: {r.text}"
        data = r.json()
        assert data["client_id"] == client_a.id
        assert data["assigned_coach"]["id"] == coach_a.id
        assert data["active_training_plan"]["name"] == "Client A Hypertrophy"
        assert data["session_stats"]["total"] == 3
        assert data["session_stats"]["completed"] == 1
        assert data["session_stats"]["cancelled"] == 1
        assert data["session_stats"]["scheduled"] == 1
        assert data["total_progress_records"] == 2
        print("✓ Test 1: Client can access own overview report (200 OK)")

        # ---------------------------------------------------------------------
        # 2. Client can access own progress report with metric deltas (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/progress", headers=auth_header(client_a.id))
        assert r.status_code == 200, f"Test 2 failed: {r.text}"
        pdata = r.json()
        assert pdata["total_records"] == 2
        # Weight delta: 78.50 - 80.00 = -1.50
        assert float(pdata["weight"]["earliest_value"]) == 80.0
        assert float(pdata["weight"]["latest_value"]) == 78.5
        assert float(pdata["weight"]["change"]) == -1.50
        # Body fat delta: 17.20 - 18.00 = -0.80
        assert float(pdata["body_fat_percentage"]["change"]) == -0.80
        # Missing measurements check
        assert pdata["waist_cm"]["earliest_value"] == "85.00"
        assert pdata["waist_cm"]["latest_value"] is None
        assert pdata["waist_cm"]["change"] is None  # no change computed when missing
        assert pdata["chest_cm"]["earliest_value"] is None
        assert pdata["chest_cm"]["latest_value"] == "100.00"
        assert pdata["chest_cm"]["change"] is None
        assert len(pdata["history"]) == 2
        print("✓ Test 2: Client can access own progress report with accurate deltas & null safety (200 OK)")

        # ---------------------------------------------------------------------
        # 3. Client can access own training report with session stats (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/training", headers=auth_header(client_a.id))
        assert r.status_code == 200, f"Test 3 failed: {r.text}"
        tdata = r.json()
        assert tdata["session_stats"]["total"] == 3
        # eligible = completed(1) + cancelled(1) = 2; rate = (1/2)*100 = 50.0%
        assert tdata["session_stats"]["eligible_outcome"] == 2
        assert tdata["session_stats"]["completion_rate"] == 50.0
        assert len(tdata["activity_by_date"]) >= 2
        print("✓ Test 3: Client can access own training report with session stats & completion rate (200 OK)")

        # ---------------------------------------------------------------------
        # 4. Client cannot access another client's overview report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/client/overview?client_id={client_b.id}", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 4 failed: {r.text}"
        print("✓ Test 4: Client cannot access another client's overview report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 5. Client cannot access another client's progress report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/client/progress?client_id={client_b.id}", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 5 failed: {r.text}"
        print("✓ Test 5: Client cannot access another client's progress report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 6. Client cannot access another client's training report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/client/training?client_id={client_b.id}", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 6 failed: {r.text}"
        print("✓ Test 6: Client cannot access another client's training report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 7. Client cannot access coach overview report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/coach/overview", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 7 failed: {r.text}"
        print("✓ Test 7: Client cannot access coach overview report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 8. Client cannot access gym overview report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/overview", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 8 failed: {r.text}"
        print("✓ Test 8: Client cannot access gym overview report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 9. Client cannot access super admin overview report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/super-admin/overview", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Test 9 failed: {r.text}"
        print("✓ Test 9: Client cannot access super admin overview report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 10. Coach can access coach overview report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/coach/overview", headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Test 10 failed: {r.text}"
        c_overview = r.json()
        assert c_overview["coach_id"] == coach_a.id
        assert c_overview["total_assigned_clients"] == 1
        assert c_overview["active_assigned_clients"] == 1
        assert c_overview["total_training_plans"] == 1
        assert c_overview["active_training_plans"] == 1
        assert c_overview["session_stats"]["total"] == 3
        print("✓ Test 10: Coach can access coach overview report (200 OK)")

        # ---------------------------------------------------------------------
        # 11. Coach can access coach assigned clients list (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/coach/clients", headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Test 11 failed: {r.text}"
        clients_list = r.json()
        assert len(clients_list) == 1
        assert clients_list[0]["client_id"] == client_a.id
        assert clients_list[0]["sessions_completed"] == 1
        assert clients_list[0]["sessions_upcoming"] == 1
        assert clients_list[0]["latest_weight_kg"] == "78.50"
        print("✓ Test 11: Coach can access coach assigned clients list (200 OK)")

        # ---------------------------------------------------------------------
        # 12. Coach can access assigned client's overview report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/coach/clients/{client_a.id}", headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Test 12 failed: {r.text}"
        assert r.json()["client_id"] == client_a.id
        print("✓ Test 12: Coach can access assigned client's overview report (200 OK)")

        # ---------------------------------------------------------------------
        # 13. Coach cannot access unassigned client report in same gym (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/coach/clients/{client_a_unassigned.id}", headers=auth_header(coach_a.id))
        assert r.status_code == 403, f"Test 13 failed: {r.text}"
        print("✓ Test 13: Coach cannot access unassigned client report in same gym (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 14. Coach cannot access client in another gym tenant (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/coach/clients/{client_b.id}", headers=auth_header(coach_a.id))
        assert r.status_code == 403, f"Test 14 failed: {r.text}"
        print("✓ Test 14: Coach cannot access client in another gym tenant (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 15. Coach cannot access gym overview report (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/overview", headers=auth_header(coach_a.id))
        assert r.status_code == 403, f"Test 15 failed: {r.text}"
        print("✓ Test 15: Coach cannot access gym overview report (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 16. Gym Admin can access gym overview report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/overview", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Test 16 failed: {r.text}"
        g_overview = r.json()
        assert g_overview["tenant_id"] == gym_a.id
        assert g_overview["total_clients"] == 2  # client_a and client_a_unassigned
        assert g_overview["total_coaches"] == 1
        assert g_overview["active_assignments"] == 1
        assert g_overview["total_training_plans"] == 1
        assert g_overview["session_stats"]["total"] == 3
        assert g_overview["total_progress_records"] == 2
        print("✓ Test 16: Gym Admin can access gym overview report (200 OK)")

        # ---------------------------------------------------------------------
        # 17. Gym Admin can access gym clients report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/clients", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Test 17 failed: {r.text}"
        g_clients = r.json()
        assert len(g_clients) == 2
        assigned_client = next(c for c in g_clients if c["client_id"] == client_a.id)
        assert assigned_client["assigned_coach_name"] == "Coach A"
        assert assigned_client["active_plan_name"] == "Client A Hypertrophy"
        assert assigned_client["total_sessions"] == 3
        print("✓ Test 17: Gym Admin can access gym clients report (200 OK)")

        # ---------------------------------------------------------------------
        # 18. Gym Admin can access gym coaches report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/coaches", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Test 18 failed: {r.text}"
        g_coaches = r.json()
        assert len(g_coaches) == 1
        assert g_coaches[0]["coach_id"] == coach_a.id
        assert g_coaches[0]["assigned_clients_count"] == 1
        assert g_coaches[0]["total_sessions"] == 3
        assert g_coaches[0]["completed_sessions"] == 1
        assert g_coaches[0]["completion_rate"] == 50.0
        print("✓ Test 18: Gym Admin can access gym coaches report (200 OK)")

        # ---------------------------------------------------------------------
        # 19. Gym Admin can access gym sessions report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/sessions", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Test 19 failed: {r.text}"
        g_sessions = r.json()
        assert g_sessions["tenant_id"] == gym_a.id
        assert g_sessions["session_stats"]["total"] == 3
        assert len(g_sessions["activity_by_date"]) >= 2
        print("✓ Test 19: Gym Admin can access gym sessions report (200 OK)")

        # ---------------------------------------------------------------------
        # 20. Gym Admin cannot access another gym's report by specifying another tenant_id (403 Forbidden)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/gym/overview?tenant_id={gym_b.id}", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 403, f"Test 20 failed: {r.text}"
        print("✓ Test 20: Gym Admin cannot access another gym's report via tenant_id query param (403 Forbidden)")

        # ---------------------------------------------------------------------
        # 21. Super Admin can access platform overview report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/super-admin/overview", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Test 21 failed: {r.text}"
        p_ov = r.json()
        assert p_ov["total_gyms"] >= 2
        assert p_ov["total_users"] >= 5
        assert p_ov["total_clients"] >= 3
        assert p_ov["total_coaches"] >= 1
        assert p_ov["total_training_plans"] >= 1
        print("✓ Test 21: Super Admin can access platform overview report (200 OK)")

        # ---------------------------------------------------------------------
        # 22. Super Admin can access all gyms summary report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/super-admin/gyms", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Test 22 failed: {r.text}"
        gyms_list = r.json()
        assert len(gyms_list) >= 2
        gym_a_entry = next(g for g in gyms_list if g["tenant_id"] == gym_a.id)
        assert gym_a_entry["total_clients"] == 2
        assert gym_a_entry["total_coaches"] == 1
        assert gym_a_entry["active_assignments"] == 1
        print("✓ Test 22: Super Admin can access all gyms summary report (200 OK)")

        # ---------------------------------------------------------------------
        # 23. Super Admin can access specific gym report (200 OK)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/reports/super-admin/gyms/{gym_a.id}", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Test 23 failed: {r.text}"
        assert r.json()["tenant_id"] == gym_a.id
        print("✓ Test 23: Super Admin can access specific gym report (200 OK)")

        # ---------------------------------------------------------------------
        # 24. Date period filtering: last_7_days, last_30_days, last_90_days, all_time
        # ---------------------------------------------------------------------
        for p in ["last_7_days", "last_30_days", "last_90_days", "all_time"]:
            r = client.get(f"/api/v1/reports/client/training?period={p}", headers=auth_header(client_a.id))
            assert r.status_code == 200, f"Test 24 failed for {p}: {r.text}"
            assert r.json()["period"]["period_type"] == p
        print("✓ Test 24: Date period filtering works across all preset periods (200 OK)")

        # ---------------------------------------------------------------------
        # 25. Custom date period with valid range (start_date <= end_date)
        # ---------------------------------------------------------------------
        start = (now - timedelta(days=6)).strftime("%Y-%m-%dT%H:%M:%SZ")
        end = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        r = client.get(
            f"/api/v1/reports/client/training?period=custom&start_date={start}&end_date={end}",
            headers=auth_header(client_a.id),
        )
        assert r.status_code == 200, f"Test 25 failed: {r.text}"
        assert r.json()["period"]["period_type"] == "custom"
        print("✓ Test 25: Custom date period with valid range accepted (200 OK)")

        # ---------------------------------------------------------------------
        # 26. Custom date period with invalid range (start_date > end_date) rejected (400)
        # ---------------------------------------------------------------------
        invalid_start = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        invalid_end = (now - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
        r = client.get(
            f"/api/v1/reports/client/training?period=custom&start_date={invalid_start}&end_date={invalid_end}",
            headers=auth_header(client_a.id),
        )
        assert r.status_code == 400, f"Test 26 failed: {r.text}"
        assert "start_date must be before or equal to end_date" in r.json()["detail"]
        print("✓ Test 26: Custom date period with inverted dates rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # 27. Custom date period missing start_date or end_date rejected (400)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/training?period=custom", headers=auth_header(client_a.id))
        assert r.status_code == 400, f"Test 27 failed: {r.text}"
        print("✓ Test 27: Custom date period missing date parameters rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # 28. Session completion rate calculation handles zero denominator correctly (0.0)
        # ---------------------------------------------------------------------
        # Client A unassigned has 0 sessions
        r = client.get(
            f"/api/v1/reports/client/training?client_id={client_a_unassigned.id}",
            headers=auth_header(gym_a_admin.id),
        )
        assert r.status_code == 200, f"Test 28 failed: {r.text}"
        assert r.json()["session_stats"]["eligible_outcome"] == 0
        assert r.json()["session_stats"]["completion_rate"] == 0.0
        print("✓ Test 28: Zero sessions outcome cleanly produces 0.0 completion rate (200 OK)")

        # ---------------------------------------------------------------------
        # 29. Progress metric change calculation: starting, latest, delta
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/progress", headers=auth_header(client_a.id))
        assert r.status_code == 200
        w = r.json()["weight"]
        assert float(w["earliest_value"]) == 80.0
        assert float(w["latest_value"]) == 78.5
        assert float(w["change"]) == -1.5
        print("✓ Test 29: Progress metric change accurately calculated as latest - earliest (200 OK)")

        # ---------------------------------------------------------------------
        # 30. Missing metric values in progress records correctly produce None for delta
        # ---------------------------------------------------------------------
        w_cm = r.json()["waist_cm"]
        assert w_cm["earliest_value"] is not None
        assert w_cm["latest_value"] is None
        assert w_cm["change"] is None
        print("✓ Test 30: Missing metric values correctly preserved as null with no phantom delta (200 OK)")

        # ---------------------------------------------------------------------
        # 31. Pagination parameters (skip, limit) work properly on list endpoints
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/clients?skip=0&limit=1", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Test 31 failed: {r.text}"
        assert len(r.json()) == 1

        r = client.get("/api/v1/reports/gym/clients?skip=1&limit=1", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200
        assert len(r.json()) == 1

        r_all = client.get("/api/v1/reports/gym/clients?skip=0&limit=50", headers=auth_header(gym_a_admin.id))
        assert len(r_all.json()) == 2
        print("✓ Test 31: Pagination controls (skip, limit) successfully paginate records (200 OK)")

        print("\n========================================================")
        print("✓ ALL 31 REPORTS & ANALYTICS SCENARIOS VERIFIED SUCCESSFULLY")
        print("========================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
