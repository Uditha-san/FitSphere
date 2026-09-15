"""
FitSphere - Training Plans & Workouts Domain Automated Verification Suite
Explicitly tests all 18 required scenarios:

 1. Coach creates plan for assigned client
 2. Coach cannot create plan for unassigned client
 3. Client cannot create plan
 4. Gym admin can view tenant plans
 5. Cross-tenant access rejected
 6. Client can only view own plans
 7. Coach cannot access another coach's plan
 8. Super admin can access platform plans across tenants
 9. Inactive coach rejected
10. Inactive client rejected
11. Invalid role rejected
12. Plan update authorization
13. Plan archive authorization
14. Workout creation authorization (day and exercise)
15. Workout ordering
16. Tenant isolation across sub-resources
17. Service-layer authorization
18. Database cascade constraints
"""

import uuid
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import (
    PlanStatus,
    TrainingPlan,
    WorkoutDay,
    WorkoutExercise,
)
from app.modules.training_plans.schemas import (
    TrainingPlanCreate,
    TrainingPlanUpdate,
    WorkoutDayCreate,
    WorkoutExerciseCreate,
)
from app.modules.training_plans.service import training_plan_service
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"tp_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Training Plans test suite with prefix: {prefix}")

    try:
        # Setup: Two Gyms (Gym A and Gym B)
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
                full_name="Admin A",
            ),
        )

        # Gym A Coach 1 & Coach 2
        coach_a1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
                full_name="Coach A1",
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

        # Gym A Client 1 & Client 2
        client_a1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client A1",
            ),
        )
        client_a2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
                full_name="Client A2",
            ),
        )

        # Gym B Coach & Client
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

        # Inactive users
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
        db.add(inactive_coach)

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
        db.add(inactive_client)
        db.commit()

        # Create active Coach-Client Assignment between Coach A1 and Client A1
        assign_a1 = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a1.id,
            client_id=client_a1.id,
            is_active=True,
        )
        # Create active Coach-Client Assignment between Coach B and Client B
        assign_b = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_b.id,
            coach_id=coach_b.id,
            client_id=client_b.id,
            is_active=True,
        )
        db.add_all([assign_a1, assign_b])
        db.commit()

        print("[+] Created test gyms, users, and assignments successfully.")

        # ==========================================
        # 1. Coach creates plan for assigned client
        # ==========================================
        print("\n--- Test 1: Coach creates plan for assigned client ---")
        payload = {
            "client_id": client_a1.id,
            "name": "Hypertrophy Phase 1",
            "description": "4-week muscle building plan",
            "status": "active",
        }
        res = client.post(
            "/api/v1/training-plans/",
            json=payload,
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        plan_data = res.json()
        plan_id = plan_data["id"]
        assert plan_data["name"] == "Hypertrophy Phase 1"
        assert plan_data["coach_id"] == coach_a1.id
        assert plan_data["client_id"] == client_a1.id
        assert plan_data["tenant_id"] == gym_a.id
        assert plan_data["status"] == "active"
        print("  [PASS] 1. Coach successfully created plan for assigned client")

        # ==========================================
        # 2. Coach cannot create plan for unassigned client
        # ==========================================
        print("\n--- Test 2: Coach cannot create plan for unassigned client ---")
        payload_unassigned = {
            "client_id": client_a2.id,  # client_a2 is not assigned to coach_a1
            "name": "Unauthorized Plan",
        }
        res = client.post(
            "/api/v1/training-plans/",
            json=payload_unassigned,
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "Active coach-client assignment required" in res.json()["detail"]
        print("  [PASS] 2. Rejected plan creation for unassigned client with 400")

        # ==========================================
        # 3. Client cannot create plan
        # ==========================================
        print("\n--- Test 3: Client cannot create plan ---")
        res = client.post(
            "/api/v1/training-plans/",
            json={"client_id": client_a1.id, "name": "Client Made Plan"},
            headers=auth_header(client_a1.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 3. Client prohibited from creating plans with 403")

        # ==========================================
        # 4. Gym admin can view tenant plans
        # ==========================================
        print("\n--- Test 4: Gym admin can view tenant plans ---")
        res = client.get(
            "/api/v1/training-plans/",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        plans = res.json()
        assert any(p["id"] == plan_id for p in plans)
        print("  [PASS] 4. Gym admin can list plans inside their own gym")

        # ==========================================
        # 5. Cross-tenant access rejected
        # ==========================================
        print("\n--- Test 5: Cross-tenant access rejected ---")
        # Gym Admin from Gym A attempts to query Gym B's plans
        res = client.get(
            f"/api/v1/training-plans/?tenant_id={gym_b.id}",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        # Coach B attempts to read Plan from Gym A
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(coach_b.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 5. Cross-tenant reads rejected with 403 Forbidden")

        # ==========================================
        # 6. Client can only view own plans
        # ==========================================
        print("\n--- Test 6: Client can only view own plans ---")
        # Client A1 accesses their own plan
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(client_a1.id),
        )
        assert res.status_code == 200
        assert res.json()["id"] == plan_id

        # Client A2 attempts to access Client A1's plan
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(client_a2.id),
        )
        assert res.status_code == 403
        print("  [PASS] 6. Client can only view their own plans; others blocked with 403")

        # ==========================================
        # 7. Coach cannot access another coach's plan
        # ==========================================
        print("\n--- Test 7: Coach cannot access another coach's plan ---")
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(coach_a2.id),
        )
        assert res.status_code == 403
        print("  [PASS] 7. Other coaches blocked from accessing plan with 403")

        # ==========================================
        # 8. Super admin can access platform plans across tenants
        # ==========================================
        print("\n--- Test 8: Super admin platform access ---")
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(super_admin.id),
        )
        assert res.status_code == 200
        assert res.json()["id"] == plan_id

        res_list = client.get(
            "/api/v1/training-plans/",
            headers=auth_header(super_admin.id),
        )
        assert res_list.status_code == 200
        print("  [PASS] 8. Super admin can access training plans across all tenants")

        # ==========================================
        # 9. Inactive coach rejected
        # ==========================================
        print("\n--- Test 9: Inactive coach rejected ---")
        res = client.post(
            "/api/v1/training-plans/",
            json={"coach_id": inactive_coach.id, "client_id": client_a1.id, "name": "Test"},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400
        assert "inactive and cannot create plans" in res.json()["detail"]
        print("  [PASS] 9. Inactive coach rejected with 400")

        # ==========================================
        # 10. Inactive client rejected
        # ==========================================
        print("\n--- Test 10: Inactive client rejected ---")
        res = client.post(
            "/api/v1/training-plans/",
            json={"coach_id": coach_a1.id, "client_id": inactive_client.id, "name": "Test"},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400
        assert "inactive and cannot be assigned a plan" in res.json()["detail"]
        print("  [PASS] 10. Inactive client rejected with 400")

        # ==========================================
        # 11. Invalid role rejected
        # ==========================================
        print("\n--- Test 11: Invalid role rejected ---")
        # Attempt to pass a client as coach
        res = client.post(
            "/api/v1/training-plans/",
            json={"coach_id": client_a2.id, "client_id": client_a1.id, "name": "Test"},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400
        assert "not a coach" in res.json()["detail"]
        print("  [PASS] 11. Invalid role rejected with 400")

        # ==========================================
        # 12. Plan update authorization
        # ==========================================
        print("\n--- Test 12: Plan update authorization ---")
        # Client attempts update -> 403
        res = client.patch(
            f"/api/v1/training-plans/{plan_id}",
            json={"name": "Client Renamed Plan"},
            headers=auth_header(client_a1.id),
        )
        assert res.status_code == 403

        # Coach updates own plan -> 200
        res = client.patch(
            f"/api/v1/training-plans/{plan_id}",
            json={"name": "Hypertrophy Phase 1 - Updated"},
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Hypertrophy Phase 1 - Updated"
        print("  [PASS] 12. Plan update authorized for coach, rejected for client (403)")

        # ==========================================
        # 13. Plan archive authorization
        # ==========================================
        print("\n--- Test 13: Plan archive authorization ---")
        res = client.post(
            f"/api/v1/training-plans/{plan_id}/archive",
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 200
        assert res.json()["status"] == PlanStatus.ARCHIVED.value
        # Re-activate for further workout tests
        res = client.patch(
            f"/api/v1/training-plans/{plan_id}",
            json={"status": PlanStatus.ACTIVE.value},
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 200
        print("  [PASS] 13. Plan archive successful (status=archived)")

        # ==========================================
        # 14. Workout creation authorization (day and exercise)
        # ==========================================
        print("\n--- Test 14: Workout creation authorization ---")
        # Client cannot create workout day -> 403
        res = client.post(
            f"/api/v1/training-plans/{plan_id}/days",
            json={"name": "Day 1: Upper Body Strength", "order_index": 0},
            headers=auth_header(client_a1.id),
        )
        assert res.status_code == 403

        # Coach creates Day 1
        res = client.post(
            f"/api/v1/training-plans/{plan_id}/days",
            json={"name": "Day 1: Upper Body Strength", "order_index": 0},
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 201
        day1 = res.json()
        day1_id = day1["id"]

        # Coach creates Exercise 1
        res = client.post(
            f"/api/v1/training-plans/days/{day1_id}/exercises",
            json={
                "exercise_name": "Barbell Bench Press",
                "sets": 4,
                "repetitions": "8-10",
                "rest_seconds": 90,
                "order_index": 0,
            },
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 201
        ex1 = res.json()
        assert ex1["exercise_name"] == "Barbell Bench Press"
        assert ex1["sets"] == 4
        print("  [PASS] 14. Workout day and exercise creation authorized for coach, rejected for client")

        # ==========================================
        # 15. Workout ordering
        # ==========================================
        print("\n--- Test 15: Workout ordering ---")
        # Add Exercise 2 with order_index 1
        client.post(
            f"/api/v1/training-plans/days/{day1_id}/exercises",
            json={
                "exercise_name": "Incline Dumbbell Press",
                "sets": 3,
                "repetitions": "12",
                "rest_seconds": 60,
                "order_index": 1,
            },
            headers=auth_header(coach_a1.id),
        )

        # Add Day 2 with order_index 1
        client.post(
            f"/api/v1/training-plans/{plan_id}/days",
            json={"name": "Day 2: Lower Body Power", "order_index": 1},
            headers=auth_header(coach_a1.id),
        )

        # Retrieve full plan and verify order
        res = client.get(
            f"/api/v1/training-plans/{plan_id}",
            headers=auth_header(coach_a1.id),
        )
        assert res.status_code == 200
        data = res.json()
        days = data["workout_days"]
        assert len(days) == 2
        assert days[0]["name"] == "Day 1: Upper Body Strength"
        assert days[1]["name"] == "Day 2: Lower Body Power"
        exercises = days[0]["exercises"]
        assert len(exercises) == 2
        assert exercises[0]["exercise_name"] == "Barbell Bench Press"
        assert exercises[1]["exercise_name"] == "Incline Dumbbell Press"
        print("  [PASS] 15. Workout days and exercises properly sequenced by order_index")

        # ==========================================
        # 16. Tenant isolation across sub-resources
        # ==========================================
        print("\n--- Test 16: Tenant isolation across sub-resources ---")
        # Coach B (Gym B) attempts to add exercise to Gym A's workout day
        res = client.post(
            f"/api/v1/training-plans/days/{day1_id}/exercises",
            json={"exercise_name": "Intruder Squat"},
            headers=auth_header(coach_b.id),
        )
        assert res.status_code == 403
        print("  [PASS] 16. Sub-resource mutations protected against cross-tenant access")

        # ==========================================
        # 17. Service-layer authorization
        # ==========================================
        print("\n--- Test 17: Service-layer authorization ---")
        try:
            training_plan_service.create(
                db,
                obj_in=TrainingPlanCreate(
                    client_id=client_a1.id,
                    name="Service Test",
                ),
                acting_user=client_a1,  # Client acting directly on service
            )
            assert False, "Service layer should have rejected client with 403"
        except HTTPException as e:
            assert e.status_code == 403
            print("  [PASS] 17a. Service-layer rejects client caller with 403")

        try:
            training_plan_service.create(
                db,
                obj_in=TrainingPlanCreate(
                    coach_id=coach_a1.id,
                    client_id=client_b.id,  # Cross-tenant client
                    name="Cross Tenant Service Test",
                ),
                acting_user=gym_a_admin,
            )
            assert False, "Service layer should have rejected cross-tenant with 400"
        except HTTPException as e:
            assert e.status_code == 400
            print("  [PASS] 17b. Service-layer rejects cross-tenant plan with 400")

        # ==========================================
        # 18. Database cascade deletion constraint
        # ==========================================
        print("\n--- Test 18: Database cascade constraints ---")
        # Verify days and exercises exist before plan delete
        day_count_before = db.query(WorkoutDay).filter(WorkoutDay.training_plan_id == plan_id).count()
        assert day_count_before == 2
        # Delete plan in DB
        db_plan = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
        db.delete(db_plan)
        db.commit()
        # Verify days and exercises were cascaded
        day_count_after = db.query(WorkoutDay).filter(WorkoutDay.training_plan_id == plan_id).count()
        exercise_count_after = db.query(WorkoutExercise).filter(WorkoutExercise.workout_day_id == day1_id).count()
        assert day_count_after == 0
        assert exercise_count_after == 0
        print("  [PASS] 18. Database cascade deletion constraint verified (days & exercises removed)")

        print("\n=======================================================")
        print(">>> ALL 18 TRAINING PLANS & WORKOUTS TESTS PASSED! <<<")
        print("=======================================================")

    finally:
        try:
            # Cleanup
            db.query(WorkoutExercise).filter(
                WorkoutExercise.tenant_id.in_([gym_a.id, gym_b.id])
            ).delete(synchronize_session=False)
            db.query(WorkoutDay).filter(
                WorkoutDay.tenant_id.in_([gym_a.id, gym_b.id])
            ).delete(synchronize_session=False)
            db.query(TrainingPlan).filter(
                TrainingPlan.tenant_id.in_([gym_a.id, gym_b.id])
            ).delete(synchronize_session=False)
            db.query(CoachClientAssignment).filter(
                CoachClientAssignment.tenant_id.in_([gym_a.id, gym_b.id])
            ).delete(synchronize_session=False)
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.slug.like(f"%{prefix}%")).delete(synchronize_session=False)
            db.commit()
            print("[*] Cleaned up test data successfully.")
        except Exception as e:
            print(f"[!] Cleanup warning: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
