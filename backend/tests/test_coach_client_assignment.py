"""
FitSphere - Coach-Client Assignment Domain Automated Verification Suite
Explicitly tests all 17 required scenarios:

 1. Successful coach-client assignment
 2. Duplicate assignment rejection
 3. Coach role validation
 4. Client role validation
 5. Cross-tenant assignment rejection
 6. Inactive coach rejection
 7. Inactive client rejection
 8. Super admin authorization
 9. Gym admin authorization
10. Coach access restrictions
11. Client access restrictions
12. Cross-tenant read protection
13. Cross-tenant delete protection
14. Assignment removal/deactivation
15. Tenant isolation
16. Service-layer authorization
17. Database uniqueness/constraint behavior
"""

import uuid
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.assignments.schemas import CoachClientAssignmentCreate
from app.modules.assignments.service import assignment_service
from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"cca_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Coach-Client Assignment test suite with prefix: {prefix}")

    try:
        # Setup: Two Gyms (A and B)
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

        # Setup: Super Admin
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                role=UserRole.SUPER_ADMIN,
                tenant_id=None,
            ),
        )

        # Setup: Gym A Admin, Coaches, Clients
        gym_a_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_a@fitsphere.test",
                password="Password123!",
                role=UserRole.GYM_ADMIN,
                tenant_id=gym_a.id,
            ),
        )
        gym_a_coach_1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH,
                tenant_id=gym_a.id,
            ),
        )
        gym_a_coach_2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH,
                tenant_id=gym_a.id,
            ),
        )
        gym_a_client_1 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a1@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT,
                tenant_id=gym_a.id,
            ),
        )
        gym_a_client_2 = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a2@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT,
                tenant_id=gym_a.id,
            ),
        )

        # Setup: Gym B Admin, Coach, Client
        gym_b_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_b@fitsphere.test",
                password="Password123!",
                role=UserRole.GYM_ADMIN,
                tenant_id=gym_b.id,
            ),
        )
        gym_b_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_b@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH,
                tenant_id=gym_b.id,
            ),
        )
        gym_b_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_b@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT,
                tenant_id=gym_b.id,
            ),
        )

        # Setup: Inactive Coach and Inactive Client
        inactive_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_inact_coach@fitsphere.test",
                password="Password123!",
                role=UserRole.COACH,
                tenant_id=gym_a.id,
            ),
        )
        inactive_coach.is_active = False

        inactive_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_inact_client@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT,
                tenant_id=gym_a.id,
            ),
        )
        inactive_client.is_active = False
        db.commit()

        print("[+] Created test tenants and users across roles and states.")

        # ==========================================
        # 1. Successful coach-client assignment
        # ==========================================
        print("\n--- Test 1: Successful coach-client assignment ---")
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_a_client_1.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assignment_1 = res.json()
        assert assignment_1["tenant_id"] == gym_a.id
        assert assignment_1["coach_id"] == gym_a_coach_1.id
        assert assignment_1["client_id"] == gym_a_client_1.id
        assert assignment_1["is_active"] is True
        print("  [PASS] 1. Successful coach-client assignment created (201)")

        # ==========================================
        # 2. Duplicate assignment rejection
        # ==========================================
        print("\n--- Test 2: Duplicate assignment rejection ---")
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_a_client_1.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "Duplicate active assignment" in res.json()["detail"]
        print("  [PASS] 2. Duplicate assignment rejected with 400")

        # ==========================================
        # 3. Coach role validation
        # ==========================================
        print("\n--- Test 3: Coach role validation ---")
        # Attempt to pass a client as coach
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_client_2.id, "client_id": gym_a_client_1.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "is not a coach" in res.json()["detail"]
        print("  [PASS] 3. Non-coach user rejected with 400")

        # ==========================================
        # 4. Client role validation
        # ==========================================
        print("\n--- Test 4: Client role validation ---")
        # Attempt to pass a coach as client
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_a_coach_2.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "is not a client" in res.json()["detail"]
        print("  [PASS] 4. Non-client user rejected with 400")

        # ==========================================
        # 5. Cross-tenant assignment rejection
        # ==========================================
        print("\n--- Test 5: Cross-tenant assignment rejection ---")
        # Coach in Gym A, client in Gym B
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_b_client.id},
            headers=auth_header(super_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "Cross-tenant assignment rejected" in res.json()["detail"]
        print("  [PASS] 5. Cross-tenant assignment rejected with 400")

        # ==========================================
        # 6. Inactive coach rejection
        # ==========================================
        print("\n--- Test 6: Inactive coach rejection ---")
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": inactive_coach.id, "client_id": gym_a_client_2.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "inactive" in res.json()["detail"].lower()
        print("  [PASS] 6. Inactive coach rejected with 400")

        # ==========================================
        # 7. Inactive client rejection
        # ==========================================
        print("\n--- Test 7: Inactive client rejection ---")
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_2.id, "client_id": inactive_client.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "inactive" in res.json()["detail"].lower()
        print("  [PASS] 7. Inactive client rejected with 400")

        # ==========================================
        # 8. Super admin authorization
        # ==========================================
        print("\n--- Test 8: Super admin authorization ---")
        # Super admin can create assignment in Gym B
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_b_coach.id, "client_id": gym_b_client.id},
            headers=auth_header(super_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assignment_b = res.json()
        assert assignment_b["tenant_id"] == gym_b.id
        # Super admin can list across all gyms
        res_list = client.get("/api/v1/assignments/", headers=auth_header(super_admin.id))
        assert res_list.status_code == 200
        all_ids = [a["id"] for a in res_list.json()]
        assert assignment_1["id"] in all_ids and assignment_b["id"] in all_ids
        print("  [PASS] 8. Super admin can create and view assignments across tenants")

        # ==========================================
        # 9. Gym admin authorization
        # ==========================================
        print("\n--- Test 9: Gym admin authorization ---")
        # Gym A admin creates second assignment in Gym A
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_2.id, "client_id": gym_a_client_2.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 201
        assignment_2 = res.json()
        # Gym A admin lists assignments in Gym A
        res = client.get("/api/v1/assignments/", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 200
        gym_a_list = res.json()
        assert all(a["tenant_id"] == gym_a.id for a in gym_a_list)
        assert not any(a["id"] == assignment_b["id"] for a in gym_a_list)
        print("  [PASS] 9. Gym admin can manage assignments inside own tenant")

        # ==========================================
        # 10. Coach access restrictions
        # ==========================================
        print("\n--- Test 10: Coach access restrictions ---")
        # Coach 1 views assignments: must see only assignment_1, not assignment_2
        res = client.get("/api/v1/assignments/", headers=auth_header(gym_a_coach_1.id))
        assert res.status_code == 200
        coach_assignments = res.json()
        assert len(coach_assignments) == 1
        assert coach_assignments[0]["id"] == assignment_1["id"]
        # Coach 1 cannot create assignments
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_a_client_2.id},
            headers=auth_header(gym_a_coach_1.id),
        )
        assert res.status_code == 403, f"Expected 403 for coach creation, got {res.status_code}"
        print("  [PASS] 10. Coach can only view their own assigned clients and cannot create (403)")

        # ==========================================
        # 11. Client access restrictions
        # ==========================================
        print("\n--- Test 11: Client access restrictions ---")
        # Client 1 views assignments: must see only assignment_1
        res = client.get("/api/v1/assignments/", headers=auth_header(gym_a_client_1.id))
        assert res.status_code == 200
        client_assignments = res.json()
        assert len(client_assignments) == 1
        assert client_assignments[0]["id"] == assignment_1["id"]
        # Client 1 cannot create assignments
        res = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_2.id, "client_id": gym_a_client_1.id},
            headers=auth_header(gym_a_client_1.id),
        )
        assert res.status_code == 403, f"Expected 403 for client creation, got {res.status_code}"
        print("  [PASS] 11. Client can only view their own assignments and cannot create (403)")

        # ==========================================
        # 12. Cross-tenant read protection
        # ==========================================
        print("\n--- Test 12: Cross-tenant read protection ---")
        # Gym A admin attempts to read Gym B assignment
        res = client.get(
            f"/api/v1/assignments/{assignment_b['id']}",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        # Coach A1 attempts to read Gym B assignment
        res = client.get(
            f"/api/v1/assignments/{assignment_b['id']}",
            headers=auth_header(gym_a_coach_1.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 12. Cross-tenant reads rejected with 403 Forbidden")

        # ==========================================
        # 13. Cross-tenant delete protection
        # ==========================================
        print("\n--- Test 13: Cross-tenant delete protection ---")
        # Gym A admin attempts to delete Gym B assignment
        res = client.delete(
            f"/api/v1/assignments/{assignment_b['id']}",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 13. Cross-tenant delete rejected with 403 Forbidden")

        # ==========================================
        # 14. Assignment removal/deactivation
        # ==========================================
        print("\n--- Test 14: Assignment removal/deactivation ---")
        # Deactivate assignment_1
        res = client.delete(
            f"/api/v1/assignments/{assignment_1['id']}",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["is_active"] is False
        # Verify that since assignment_1 is deactivated, creating a new assignment between the same coach and client now succeeds!
        res_recreate = client.post(
            "/api/v1/assignments/",
            json={"coach_id": gym_a_coach_1.id, "client_id": gym_a_client_1.id},
            headers=auth_header(gym_a_admin.id),
        )
        assert res_recreate.status_code == 201, f"Expected 201 on re-assignment, got {res_recreate.status_code}"
        assert res_recreate.json()["is_active"] is True
        print("  [PASS] 14. Assignment deactivated (is_active=False) and re-assignment succeeds")

        # ==========================================
        # 15. Tenant isolation
        # ==========================================
        print("\n--- Test 15: Tenant isolation ---")
        # Gym A admin supplies query param ?tenant_id=gym_b.id: must be rejected with 403
        res = client.get(
            f"/api/v1/assignments/?tenant_id={gym_b.id}",
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 15. Client-supplied tenant_id query param cannot bypass isolation (403)")

        # ==========================================
        # 16. Service-layer authorization
        # ==========================================
        print("\n--- Test 16: Service-layer authorization ---")
        # Direct service call with client acting_user
        try:
            assignment_service.create(
                db,
                obj_in=CoachClientAssignmentCreate(
                    coach_id=gym_a_coach_1.id, client_id=gym_a_client_2.id
                ),
                acting_user=gym_a_client_1,
            )
            assert False, "Service should have rejected client with 403"
        except HTTPException as e:
            assert e.status_code == 403
            print("  [PASS] 16a. Service-layer rejects client caller with 403")

        # Direct service call: Gym admin creating in another gym
        try:
            assignment_service.create(
                db,
                obj_in=CoachClientAssignmentCreate(
                    coach_id=gym_b_coach.id, client_id=gym_b_client.id
                ),
                acting_user=gym_a_admin,
            )
            assert False, "Service should have rejected cross-tenant creation with 403"
        except HTTPException as e:
            assert e.status_code == 403
            print("  [PASS] 16b. Service-layer rejects gym_admin cross-tenant creation with 403")

        # ==========================================
        # 17. Database uniqueness/constraint behavior
        # ==========================================
        print("\n--- Test 17: Database uniqueness constraint behavior ---")
        # Create raw entity in DB directly to test PostgreSQL partial unique index
        dup_row = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=gym_a_coach_1.id,
            client_id=gym_a_client_1.id,
            is_active=True,
        )
        db.add(dup_row)
        try:
            db.commit()
            assert False, "Database should have raised IntegrityError on duplicate active assignment"
        except IntegrityError as e:
            db.rollback()
            assert "uq_active_coach_client_assignment" in str(e)
            print("  [PASS] 17. Database partial unique index 'uq_active_coach_client_assignment' enforced")

        print("\n=======================================================")
        print(">>> ALL 17 COACH-CLIENT ASSIGNMENT TESTS PASSED! <<<")
        print("=======================================================")

    finally:
        try:
            db.query(CoachClientAssignment).filter(
                CoachClientAssignment.coach_id.in_(
                    db.query(User.id).filter(User.email.like(f"{prefix}%"))
                )
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
