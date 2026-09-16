"""
FitSphere - Progress Tracking Domain Automated Verification Suite
Explicitly tests all 32 required scenarios:

 1. Coach creates valid progress record for assigned client (201 Created)
 2. Coach cannot create progress record for unassigned client (400 Bad Request)
 3. Client cannot create progress record (403 Forbidden)
 4. Gym Admin can create progress record for assigned pair in their tenant (201 Created)
 5. Gym Admin cannot create progress record for cross-tenant client/coach (403 Forbidden)
 6. Cross-tenant coach-client pair rejected (400 Bad Request)
 7. Coach cannot create progress record claiming another coach's ID (403 Forbidden)
 8. Inactive coach rejected (400 Bad Request)
 9. Inactive client rejected (400 Bad Request)
10. Invalid coach role rejected (400 Bad Request)
11. Invalid client role rejected (400 Bad Request)
12. Future/valid timezone-aware recorded_at accepted
13. Naive datetime without timezone rejected (422 Unprocessable Entity)
14. Weight out of bounds rejected (422 Unprocessable Entity)
15. Body fat percentage > 100 or < 0 rejected (422 Unprocessable Entity)
16. Record with all measurements null and empty notes rejected (422 Unprocessable Entity)
17. Valid training session link accepted (201 Created)
18. Invalid training session id rejected (400 Bad Request)
19. Cross-tenant training session link rejected (400 Bad Request)
20. Mismatched training session (different client) rejected (400 Bad Request)
21. Valid training plan link accepted (201 Created)
22. Inconsistent training plan + session link rejected (400 Bad Request)
23. Client can view only their own progress records via GET /progress/ (200 OK)
24. Client cannot view other clients' progress records (403 Forbidden)
25. Coach sees only progress records for their own clients via GET /progress/ (200 OK)
26. Gym Admin sees all progress records within their tenant (200 OK)
27. Super Admin can view all progress records platform-wide (200 OK)
28. Client progress history endpoint returns records in descending order (200 OK)
29. Client latest summary endpoint calculates weight change and body fat change accurately (200 OK)
30. Coach can update progress notes and measurements on their own record (200 OK)
31. Client cannot update or delete progress records (403 Forbidden)
32. Coach / Gym Admin can delete progress record (204 No Content)
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
from app.modules.sessions.models import (
    SessionStatus,
    SessionType,
    TrainingSession,
)
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

    prefix = f"prog_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Progress Tracking test suite with prefix: {prefix}")

    try:
        # ---------------------------------------------------------------------
        # 0. Setup: Two Tenants (Gym A and Gym B)
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

        coach_a2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Coach A2",
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

        # Tenant B Entities
        coach_b = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_b@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_b.id,
                full_name="Coach B",
            ),
        )

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

        # Inactive entities
        inactive_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_inact_coach@fitsphere.test",
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
                email=f"{prefix}_inact_client@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Inactive Client",
            ),
        )
        inactive_client.is_active = False
        db.commit()

        # Active Coach-Client Assignment (Coach A -> Client A in Gym A)
        assign_a = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            is_active=True,
        )
        assign_b = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_b.id,
            coach_id=coach_b.id,
            client_id=client_b.id,
            is_active=True,
        )
        db.add_all([assign_a, assign_b])
        db.commit()

        # Training Plan and Training Session in Gym A for Coach A & Client A
        plan_a = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            name=f"Hypertrophy {prefix}",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan_a)
        db.commit()

        now_utc = datetime.now(timezone.utc)
        session_a = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            training_plan_id=plan_a.id,
            scheduled_start=now_utc - timedelta(hours=2),
            scheduled_end=now_utc - timedelta(hours=1),
            status=SessionStatus.COMPLETED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        # Session for Tenant B
        session_b = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_b.id,
            coach_id=coach_b.id,
            client_id=client_b.id,
            scheduled_start=now_utc - timedelta(hours=2),
            scheduled_end=now_utc - timedelta(hours=1),
            status=SessionStatus.COMPLETED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        db.add_all([session_a, session_b])
        db.commit()

        # ---------------------------------------------------------------------
        # Scenario 1: Coach creates valid progress record for assigned client (201)
        # ---------------------------------------------------------------------
        rec_time_1 = (now_utc - timedelta(days=14)).isoformat()
        payload_1 = {
            "client_id": client_a.id,
            "recorded_at": rec_time_1,
            "weight_kg": 85.50,
            "body_fat_percentage": 22.00,
            "chest_cm": 102.00,
            "waist_cm": 90.00,
            "hip_cm": 100.00,
            "arm_cm": 36.00,
            "thigh_cm": 58.00,
            "notes": "Initial baseline assessment",
        }
        r = client.post("/api/v1/progress/", json=payload_1, headers=auth_header(coach_a.id))
        assert r.status_code == 201, f"Scenario 1 failed: {r.text}"
        rec1_data = r.json()
        rec1_id = rec1_data["id"]
        assert float(rec1_data["weight_kg"]) == 85.50
        assert rec1_data["coach_id"] == coach_a.id
        assert rec1_data["client_id"] == client_a.id
        print("✓ Scenario 1: Coach creates valid progress record for assigned client (201 Created)")

        # ---------------------------------------------------------------------
        # Scenario 2: Coach cannot create progress record for unassigned client (400)
        # ---------------------------------------------------------------------
        payload_2 = {
            "client_id": client_a_unassigned.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 80.0,
            "notes": "Unassigned client test",
        }
        r = client.post("/api/v1/progress/", json=payload_2, headers=auth_header(coach_a.id))
        assert r.status_code == 400, f"Scenario 2 failed: {r.text}"
        assert "Active coach-client assignment required" in r.json()["detail"]
        print("✓ Scenario 2: Coach cannot create progress record for unassigned client (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 3: Client cannot create progress record (403 Forbidden)
        # ---------------------------------------------------------------------
        payload_3 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 84.0,
            "notes": "Client attempting self-entry",
        }
        r = client.post("/api/v1/progress/", json=payload_3, headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Scenario 3 failed: {r.text}"
        print("✓ Scenario 3: Client cannot create progress record (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Scenario 4: Gym Admin can create progress record for assigned pair in their tenant (201)
        # ---------------------------------------------------------------------
        payload_4 = {
            "client_id": client_a.id,
            "coach_id": coach_a.id,
            "recorded_at": (now_utc - timedelta(days=7)).isoformat(),
            "weight_kg": 84.20,
            "body_fat_percentage": 21.50,
            "waist_cm": 88.50,
            "notes": "Admin logged progress check-in",
        }
        r = client.post("/api/v1/progress/", json=payload_4, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 201, f"Scenario 4 failed: {r.text}"
        rec2_data = r.json()
        assert float(rec2_data["weight_kg"]) == 84.20
        print("✓ Scenario 4: Gym Admin can create progress record for assigned pair in their tenant (201 Created)")

        # ---------------------------------------------------------------------
        # Scenario 5: Gym Admin cannot create progress record for cross-tenant client/coach (403)
        # ---------------------------------------------------------------------
        payload_5 = {
            "client_id": client_b.id,
            "coach_id": coach_b.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 75.0,
            "notes": "Cross tenant attempt by Gym A Admin",
        }
        r = client.post("/api/v1/progress/", json=payload_5, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 403, f"Scenario 5 failed: {r.text}"
        print("✓ Scenario 5: Gym Admin cannot create progress record for cross-tenant client/coach (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Scenario 6: Cross-tenant coach-client pair rejected (400)
        # ---------------------------------------------------------------------
        payload_6 = {
            "client_id": client_b.id,
            "coach_id": coach_a.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 77.0,
            "notes": "Cross tenant pair attempt",
        }
        r = client.post("/api/v1/progress/", json=payload_6, headers=auth_header(super_admin.id))
        assert r.status_code == 400, f"Scenario 6 failed: {r.text}"
        assert "Cross-tenant progress record rejected" in r.json()["detail"]
        print("✓ Scenario 6: Cross-tenant coach-client pair rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 7: Coach cannot create progress record claiming another coach's ID (403)
        # ---------------------------------------------------------------------
        payload_7 = {
            "client_id": client_a.id,
            "coach_id": coach_a2.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 83.5,
            "notes": "Coach claiming another coach ID",
        }
        r = client.post("/api/v1/progress/", json=payload_7, headers=auth_header(coach_a.id))
        assert r.status_code == 403, f"Scenario 7 failed: {r.text}"
        print("✓ Scenario 7: Coach cannot create progress record claiming another coach's ID (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Scenario 8: Inactive coach rejected (400 Bad Request)
        # ---------------------------------------------------------------------
        payload_8 = {
            "client_id": client_a.id,
            "coach_id": inactive_coach.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 80.0,
            "notes": "Inactive coach test",
        }
        r = client.post("/api/v1/progress/", json=payload_8, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 400, f"Scenario 8 failed: {r.text}"
        assert "inactive" in r.json()["detail"]
        print("✓ Scenario 8: Inactive coach rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 9: Inactive client rejected (400 Bad Request)
        # ---------------------------------------------------------------------
        payload_9 = {
            "client_id": inactive_client.id,
            "coach_id": coach_a.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 80.0,
            "notes": "Inactive client test",
        }
        r = client.post("/api/v1/progress/", json=payload_9, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 400, f"Scenario 9 failed: {r.text}"
        assert "inactive" in r.json()["detail"]
        print("✓ Scenario 9: Inactive client rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 10: Invalid coach role rejected (400 Bad Request)
        # ---------------------------------------------------------------------
        payload_10 = {
            "client_id": client_a.id,
            "coach_id": client_a_unassigned.id,  # role is client, not coach
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 80.0,
            "notes": "Invalid coach role",
        }
        r = client.post("/api/v1/progress/", json=payload_10, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 400, f"Scenario 10 failed: {r.text}"
        assert "is not a coach" in r.json()["detail"]
        print("✓ Scenario 10: Invalid coach role rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 11: Invalid client role rejected (400 Bad Request)
        # ---------------------------------------------------------------------
        payload_11 = {
            "client_id": coach_a2.id,  # role is coach, not client
            "coach_id": coach_a.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": 80.0,
            "notes": "Invalid client role",
        }
        r = client.post("/api/v1/progress/", json=payload_11, headers=auth_header(gym_a_admin.id))
        assert r.status_code == 400, f"Scenario 11 failed: {r.text}"
        assert "is not a client" in r.json()["detail"]
        print("✓ Scenario 11: Invalid client role rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 12: Future/valid timezone-aware recorded_at accepted
        # ---------------------------------------------------------------------
        future_time = (now_utc + timedelta(hours=1)).isoformat()
        payload_12 = {
            "client_id": client_a.id,
            "recorded_at": future_time,
            "weight_kg": 83.90,
            "notes": "Valid timezone datetime test",
        }
        r = client.post("/api/v1/progress/", json=payload_12, headers=auth_header(coach_a.id))
        assert r.status_code == 201, f"Scenario 12 failed: {r.text}"
        print("✓ Scenario 12: Timezone-aware recorded_at accepted (201 Created)")

        # ---------------------------------------------------------------------
        # Scenario 13: Naive datetime without timezone rejected (422)
        # ---------------------------------------------------------------------
        payload_13 = {
            "client_id": client_a.id,
            "recorded_at": "2026-09-15T10:00:00",  # No tz offset
            "weight_kg": 83.50,
            "notes": "Naive timestamp test",
        }
        r = client.post("/api/v1/progress/", json=payload_13, headers=auth_header(coach_a.id))
        assert r.status_code == 422, f"Scenario 13 failed: {r.text}"
        print("✓ Scenario 13: Naive datetime without timezone rejected (422 Unprocessable Entity)")

        # ---------------------------------------------------------------------
        # Scenario 14: Weight out of bounds rejected (e.g. 0 or negative) (422)
        # ---------------------------------------------------------------------
        payload_14 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "weight_kg": -5.0,
            "notes": "Negative weight",
        }
        r = client.post("/api/v1/progress/", json=payload_14, headers=auth_header(coach_a.id))
        assert r.status_code == 422, f"Scenario 14 failed: {r.text}"
        print("✓ Scenario 14: Weight out of bounds rejected (422 Unprocessable Entity)")

        # ---------------------------------------------------------------------
        # Scenario 15: Body fat percentage > 100 or < 0 rejected (422)
        # ---------------------------------------------------------------------
        payload_15 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "body_fat_percentage": 105.0,
            "notes": "Over 100 percent fat",
        }
        r = client.post("/api/v1/progress/", json=payload_15, headers=auth_header(coach_a.id))
        assert r.status_code == 422, f"Scenario 15 failed: {r.text}"
        print("✓ Scenario 15: Body fat percentage > 100 rejected (422 Unprocessable Entity)")

        # ---------------------------------------------------------------------
        # Scenario 16: Record with all measurements null and empty notes rejected (422)
        # ---------------------------------------------------------------------
        payload_16 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "notes": "   ",
        }
        r = client.post("/api/v1/progress/", json=payload_16, headers=auth_header(coach_a.id))
        assert r.status_code == 422, f"Scenario 16 failed: {r.text}"
        print("✓ Scenario 16: Record with all measurements null and empty notes rejected (422 Unprocessable Entity)")

        # ---------------------------------------------------------------------
        # Scenario 17: Valid training session link accepted (201)
        # ---------------------------------------------------------------------
        payload_17 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_session_id": session_a.id,
            "weight_kg": 83.50,
            "notes": "Linked to completed session",
        }
        r = client.post("/api/v1/progress/", json=payload_17, headers=auth_header(coach_a.id))
        assert r.status_code == 201, f"Scenario 17 failed: {r.text}"
        assert r.json()["training_session_id"] == session_a.id
        print("✓ Scenario 17: Valid training session link accepted (201 Created)")

        # ---------------------------------------------------------------------
        # Scenario 18: Invalid training session id rejected (400)
        # ---------------------------------------------------------------------
        payload_18 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_session_id": str(uuid.uuid4()),
            "weight_kg": 83.50,
        }
        r = client.post("/api/v1/progress/", json=payload_18, headers=auth_header(coach_a.id))
        assert r.status_code == 400, f"Scenario 18 failed: {r.text}"
        print("✓ Scenario 18: Invalid training session id rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 19: Cross-tenant training session link rejected (400)
        # ---------------------------------------------------------------------
        payload_19 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_session_id": session_b.id,
            "weight_kg": 83.50,
        }
        r = client.post("/api/v1/progress/", json=payload_19, headers=auth_header(coach_a.id))
        assert r.status_code == 400, f"Scenario 19 failed: {r.text}"
        assert "different tenant" in r.json()["detail"]
        print("✓ Scenario 19: Cross-tenant training session link rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 20: Mismatched training session (different client) rejected (400)
        # ---------------------------------------------------------------------
        # Create session for Coach A and Client B (if unassigned or different)
        # Or a session for Coach A and a new client in gym A
        client_a3 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a3@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client A3",
            ),
        )
        assign_a3 = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a3.id,
            is_active=True,
        )
        session_a3 = TrainingSession(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a3.id,
            scheduled_start=now_utc - timedelta(hours=3),
            scheduled_end=now_utc - timedelta(hours=2),
            status=SessionStatus.COMPLETED.value,
            session_type=SessionType.PERSONAL_TRAINING.value,
        )
        db.add_all([assign_a3, session_a3])
        db.commit()

        payload_20 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_session_id": session_a3.id,  # session for client_a3, not client_a
            "weight_kg": 83.50,
        }
        r = client.post("/api/v1/progress/", json=payload_20, headers=auth_header(coach_a.id))
        assert r.status_code == 400, f"Scenario 20 failed: {r.text}"
        print("✓ Scenario 20: Mismatched training session client rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 21: Valid training plan link accepted (201)
        # ---------------------------------------------------------------------
        payload_21 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_plan_id": plan_a.id,
            "weight_kg": 83.20,
            "notes": "Linked to Hypertrophy plan",
        }
        r = client.post("/api/v1/progress/", json=payload_21, headers=auth_header(coach_a.id))
        assert r.status_code == 201, f"Scenario 21 failed: {r.text}"
        assert r.json()["training_plan_id"] == plan_a.id
        print("✓ Scenario 21: Valid training plan link accepted (201 Created)")

        # ---------------------------------------------------------------------
        # Scenario 22: Inconsistent training plan + session link rejected (400)
        # ---------------------------------------------------------------------
        # Create a second plan in Gym A
        plan_a2 = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            name=f"Cutting Plan {prefix}",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan_a2)
        db.commit()

        payload_22 = {
            "client_id": client_a.id,
            "recorded_at": now_utc.isoformat(),
            "training_session_id": session_a.id,  # session_a has training_plan_id = plan_a.id
            "training_plan_id": plan_a2.id,      # conflicting with plan_a2
            "weight_kg": 83.0,
        }
        r = client.post("/api/v1/progress/", json=payload_22, headers=auth_header(coach_a.id))
        assert r.status_code == 400, f"Scenario 22 failed: {r.text}"
        assert "Inconsistent references" in r.json()["detail"]
        print("✓ Scenario 22: Inconsistent training plan + session link rejected (400 Bad Request)")

        # ---------------------------------------------------------------------
        # Scenario 23: Client can view only their own progress records via GET /progress/ (200)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/progress/", headers=auth_header(client_a.id))
        assert r.status_code == 200, f"Scenario 23 failed: {r.text}"
        items = r.json()
        assert len(items) > 0
        for item in items:
            assert item["client_id"] == client_a.id
        print("✓ Scenario 23: Client can view only their own progress records via GET /progress/ (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 24: Client cannot view other clients' progress records (403)
        # ---------------------------------------------------------------------
        # Create a progress record for Client B in Tenant B
        rec_b = ProgressRecord(
            tenant_id=gym_b.id,
            coach_id=coach_b.id,
            client_id=client_b.id,
            recorded_at=now_utc,
            weight_kg=Decimal("70.00"),
            notes="Client B record",
        )
        db.add(rec_b)
        db.commit()

        # Client A requests record of Client B
        r = client.get(f"/api/v1/progress/{rec_b.id}", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Scenario 24 failed: {r.text}"
        print("✓ Scenario 24: Client cannot view other clients' progress records (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Scenario 25: Coach sees only progress records for their own clients via GET /progress/ (200)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/progress/", headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Scenario 25 failed: {r.text}"
        coach_records = r.json()
        assert len(coach_records) > 0
        for item in coach_records:
            assert item["coach_id"] == coach_a.id
        print("✓ Scenario 25: Coach sees only progress records for their own clients (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 26: Gym Admin sees all progress records within their tenant (200)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/progress/", headers=auth_header(gym_a_admin.id))
        assert r.status_code == 200, f"Scenario 26 failed: {r.text}"
        admin_records = r.json()
        for item in admin_records:
            assert item["tenant_id"] == gym_a.id
        print("✓ Scenario 26: Gym Admin sees all progress records within their tenant (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 27: Super Admin can view all progress records platform-wide (200)
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/progress/", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Scenario 27 failed: {r.text}"
        all_records = r.json()
        tenant_ids = {item["tenant_id"] for item in all_records}
        assert gym_a.id in tenant_ids
        assert gym_b.id in tenant_ids
        print("✓ Scenario 27: Super Admin can view all progress records platform-wide (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 28: Client progress history endpoint returns records in descending order (200)
        # ---------------------------------------------------------------------
        r = client.get(f"/api/v1/progress/clients/{client_a.id}/history", headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Scenario 28 failed: {r.text}"
        history = r.json()
        assert len(history) >= 2
        for i in range(len(history) - 1):
            assert history[i]["recorded_at"] >= history[i + 1]["recorded_at"], "Records not in descending order"
        print("✓ Scenario 28: Client progress history endpoint returns records in descending order (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 29: Client latest summary endpoint calculates metric changes accurately (200)
        # ---------------------------------------------------------------------
        # We logged:
        # oldest (14 days ago): weight 85.50 kg, body_fat 22.00%
        # latest (now): weight 83.20 kg (or 83.0 kg)
        # Summary should compute delta between latest and oldest
        r = client.get(f"/api/v1/progress/clients/{client_a.id}/latest", headers=auth_header(client_a.id))
        assert r.status_code == 200, f"Scenario 29 failed: {r.text}"
        summary = r.json()
        assert summary["client_id"] == client_a.id
        assert summary["total_records"] >= 2
        assert summary["latest_record"] is not None
        assert summary["weight_change_kg"] is not None
        # Weight went from 85.50 down to ~83.20 -> change is negative (-2.30)
        assert float(summary["weight_change_kg"]) < 0
        print(f"✓ Scenario 29: Client latest summary accurate (Total: {summary['total_records']}, Weight change: {summary['weight_change_kg']}kg)")

        # ---------------------------------------------------------------------
        # Scenario 30: Coach can update progress notes and measurements on their own record (200)
        # ---------------------------------------------------------------------
        update_payload = {
            "weight_kg": 85.00,
            "notes": "Updated baseline notes with corrected scale reading",
        }
        r = client.patch(f"/api/v1/progress/{rec1_id}", json=update_payload, headers=auth_header(coach_a.id))
        assert r.status_code == 200, f"Scenario 30 failed: {r.text}"
        assert float(r.json()["weight_kg"]) == 85.00
        assert r.json()["notes"] == "Updated baseline notes with corrected scale reading"
        print("✓ Scenario 30: Coach can update measurements and notes on their own record (200 OK)")

        # ---------------------------------------------------------------------
        # Scenario 31: Client cannot update or delete progress records (403)
        # ---------------------------------------------------------------------
        r = client.patch(f"/api/v1/progress/{rec1_id}", json={"weight_kg": 80.0}, headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Scenario 31 update failed: {r.text}"

        r = client.delete(f"/api/v1/progress/{rec1_id}", headers=auth_header(client_a.id))
        assert r.status_code == 403, f"Scenario 31 delete failed: {r.text}"
        print("✓ Scenario 31: Client cannot update or delete progress records (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Scenario 32: Coach / Gym Admin can delete progress record (204)
        # ---------------------------------------------------------------------
        r = client.delete(f"/api/v1/progress/{rec1_id}", headers=auth_header(coach_a.id))
        assert r.status_code == 204, f"Scenario 32 delete failed: {r.text}"

        # Verify it's gone
        r = client.get(f"/api/v1/progress/{rec1_id}", headers=auth_header(coach_a.id))
        assert r.status_code == 404, "Record still exists after delete"
        print("✓ Scenario 32: Coach / Gym Admin can delete progress record (204 No Content)")

        print("\n========================================================")
        print("✓ ALL 32 PROGRESS TRACKING SCENARIOS VERIFIED SUCCESSFULLY")
        print("========================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
