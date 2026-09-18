"""
FitSphere - Tenant-Aware Authorization & RBAC Automated Test Suite
Explicitly tests all 32 required scenarios:

Tenant Tests:
 1. super_admin can list tenants
 2. gym_admin cannot list all tenants
 3. coach cannot list all tenants
 4. client cannot list all tenants
 5. gym_admin can retrieve own tenant
 6. gym_admin cannot retrieve another tenant
 7. client can retrieve own tenant
 8. client cannot retrieve another tenant
 9. super_admin can retrieve any tenant
10. only super_admin can create tenant

User Listing Tests:
11. super_admin can list users
12. gym_admin sees only their tenant users
13. gym_admin cannot access another tenant's users
14. coach sees only same-tenant users
15. client cannot list users

User Profile Tests:
16. client can retrieve their own profile
17. client cannot retrieve another client
18. gym_admin can retrieve same-tenant user
19. gym_admin cannot retrieve cross-tenant user
20. super_admin can retrieve any user

User Creation Tests:
21. super_admin can create gym_admin
22. super_admin can create coach
23. gym_admin can create coach in own tenant
24. gym_admin can create client in own tenant
25. gym_admin cannot create super_admin
26. gym_admin cannot create gym_admin
27. gym_admin cannot create user in another tenant
28. coach cannot create user
29. client cannot create user

Live-State Tests:
30. inactive user cannot access protected endpoints
31. role changed in database is immediately respected
32. tenant changed in database is immediately respected
"""

import uuid
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    """Generate Authorization header for a given user id."""
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"rbac_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting RBAC verification suite with prefix: {prefix}")

    try:
        # 1. Create two distinct tenants (Gym A and Gym B)
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
        db.refresh(gym_a)
        db.refresh(gym_b)
        print(f"[+] Created Gym A ({gym_a.id}) and Gym B ({gym_b.id})")

        # 2. Create users for Gym A and Gym B + Super Admin
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                tenant_id=None,
            )
        )

        gym_a_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_a@fitsphere.test",
                password="Password123!",
                full_name="Gym A Admin",
                role=UserRole.GYM_ADMIN,
                tenant_id=gym_a.id,
            )
        )

        gym_a_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a@fitsphere.test",
                password="Password123!",
                full_name="Gym A Coach",
                role=UserRole.COACH,
                tenant_id=gym_a.id,
            )
        )

        gym_a_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a@fitsphere.test",
                password="Password123!",
                full_name="Gym A Client",
                role=UserRole.CLIENT,
                tenant_id=gym_a.id,
            )
        )

        gym_b_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_b@fitsphere.test",
                password="Password123!",
                full_name="Gym B Client",
                role=UserRole.CLIENT,
                tenant_id=gym_b.id,
            )
        )
        print("[+] Created all test users across Gym A and Gym B")

        # ==========================================
        # TENANT TESTS (1 - 10)
        # ==========================================
        print("\n=== TENANT AUTHORIZATION TESTS ===")

        # Test 1: super_admin can list tenants
        res = client.get("/api/v1/tenants/?limit=500", headers=auth_header(super_admin.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        tenant_ids = [t["id"] for t in res.json()]
        assert gym_a.id in tenant_ids and gym_b.id in tenant_ids
        print("  [PASS] 1. super_admin can list tenants")

        # Test 2: gym_admin cannot list all tenants
        res = client.get("/api/v1/tenants/", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 2. gym_admin cannot list all tenants (403)")

        # Test 3: coach cannot list all tenants
        res = client.get("/api/v1/tenants/", headers=auth_header(gym_a_coach.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 3. coach cannot list all tenants (403)")

        # Test 4: client cannot list all tenants
        res = client.get("/api/v1/tenants/", headers=auth_header(gym_a_client.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 4. client cannot list all tenants (403)")

        # Test 5: gym_admin can retrieve own tenant
        res = client.get(f"/api/v1/tenants/{gym_a.id}", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["id"] == gym_a.id
        print("  [PASS] 5. gym_admin can retrieve own tenant (200)")

        # Test 6: gym_admin cannot retrieve another tenant
        res = client.get(f"/api/v1/tenants/{gym_b.id}", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 6. gym_admin cannot retrieve another tenant (403)")

        # Test 7: client can retrieve own tenant
        res = client.get(f"/api/v1/tenants/{gym_a.id}", headers=auth_header(gym_a_client.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["id"] == gym_a.id
        print("  [PASS] 7. client can retrieve own tenant (200)")

        # Test 8: client cannot retrieve another tenant
        res = client.get(f"/api/v1/tenants/{gym_b.id}", headers=auth_header(gym_a_client.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 8. client cannot retrieve another tenant (403)")

        # Test 9: super_admin can retrieve any tenant
        res_a = client.get(f"/api/v1/tenants/{gym_a.id}", headers=auth_header(super_admin.id))
        res_b = client.get(f"/api/v1/tenants/{gym_b.id}", headers=auth_header(super_admin.id))
        assert res_a.status_code == 200 and res_b.status_code == 200
        print("  [PASS] 9. super_admin can retrieve any tenant (200)")

        # Test 10: only super_admin can create tenant
        # Non-super_admin attempt
        res = client.post("/api/v1/tenants/", json={"name": f"Hacked Gym {prefix}"}, headers=auth_header(gym_a_admin.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        # super_admin attempt
        res = client.post("/api/v1/tenants/", json={"name": f"Official Gym {prefix}"}, headers=auth_header(super_admin.id))
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        created_tenant_id = res.json()["id"]
        print("  [PASS] 10. only super_admin can create tenant (non-super rejected 403, super allowed 201)")

        # ==========================================
        # USER LISTING TESTS (11 - 15)
        # ==========================================
        print("\n=== USER LISTING TESTS ===")

        # Test 11: super_admin can list users
        res = client.get("/api/v1/users/", headers=auth_header(super_admin.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        all_users = res.json()
        assert len(all_users) >= 5
        print("  [PASS] 11. super_admin can list users across platform (200)")

        # Test 12: gym_admin sees only their tenant users
        res = client.get("/api/v1/users/", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        users_a = res.json()
        assert all(u["tenant_id"] == gym_a.id for u in users_a)
        assert any(u["id"] == gym_a_client.id for u in users_a)
        assert not any(u["id"] == gym_b_client.id for u in users_a)
        print("  [PASS] 12. gym_admin sees only their own tenant users")

        # Test 13: gym_admin cannot access another tenant's users
        res = client.get(f"/api/v1/users/?tenant_id={gym_b.id}", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 13. gym_admin attempting cross-tenant list query rejected with 403")

        # Test 14: coach sees only same-tenant users
        res = client.get("/api/v1/users/", headers=auth_header(gym_a_coach.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        coach_view = res.json()
        assert all(u["tenant_id"] == gym_a.id for u in coach_view)
        assert not any(u["id"] == gym_b_client.id for u in coach_view)
        print("  [PASS] 14. coach sees only same-tenant users")

        # Test 15: client cannot list users
        res = client.get("/api/v1/users/", headers=auth_header(gym_a_client.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 15. client cannot list users (403)")

        # ==========================================
        # USER PROFILE TESTS (16 - 20)
        # ==========================================
        print("\n=== USER PROFILE TESTS ===")

        # Test 16: client can retrieve their own profile
        res = client.get(f"/api/v1/users/{gym_a_client.id}", headers=auth_header(gym_a_client.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["id"] == gym_a_client.id
        print("  [PASS] 16. client can retrieve their own profile (200)")

        # Test 17: client cannot retrieve another client
        res = client.get(f"/api/v1/users/{gym_b_client.id}", headers=auth_header(gym_a_client.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 17. client cannot retrieve another client (403)")

        # Test 18: gym_admin can retrieve same-tenant user
        res = client.get(f"/api/v1/users/{gym_a_client.id}", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["id"] == gym_a_client.id
        print("  [PASS] 18. gym_admin can retrieve same-tenant user (200)")

        # Test 19: gym_admin cannot retrieve cross-tenant user
        res = client.get(f"/api/v1/users/{gym_b_client.id}", headers=auth_header(gym_a_admin.id))
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 19. gym_admin cannot retrieve cross-tenant user (403)")

        # Test 20: super_admin can retrieve any user
        res_a = client.get(f"/api/v1/users/{gym_a_client.id}", headers=auth_header(super_admin.id))
        res_b = client.get(f"/api/v1/users/{gym_b_client.id}", headers=auth_header(super_admin.id))
        assert res_a.status_code == 200 and res_b.status_code == 200
        print("  [PASS] 20. super_admin can retrieve any user across any gym (200)")

        # ==========================================
        # USER CREATION TESTS (21 - 29)
        # ==========================================
        print("\n=== USER CREATION TESTS ===")

        # Test 21: super_admin can create gym_admin
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_new_admin_b@fitsphere.test",
                "password": "Password123!",
                "role": "gym_admin",
                "tenant_id": gym_b.id,
            },
            headers=auth_header(super_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assert res.json()["role"] == "gym_admin"
        print("  [PASS] 21. super_admin can create gym_admin (201)")

        # Test 22: super_admin can create coach
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_new_coach_b@fitsphere.test",
                "password": "Password123!",
                "role": "coach",
                "tenant_id": gym_b.id,
            },
            headers=auth_header(super_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assert res.json()["role"] == "coach"
        print("  [PASS] 22. super_admin can create coach (201)")

        # Test 23: gym_admin can create coach in own tenant
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_created_coach_a@fitsphere.test",
                "password": "Password123!",
                "role": "coach",
                "tenant_id": gym_a.id,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assert res.json()["tenant_id"] == gym_a.id
        print("  [PASS] 23. gym_admin can create coach in own tenant (201)")

        # Test 24: gym_admin can create client in own tenant
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_created_client_a@fitsphere.test",
                "password": "Password123!",
                "role": "client",
                "tenant_id": gym_a.id,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        assert res.json()["tenant_id"] == gym_a.id
        print("  [PASS] 24. gym_admin can create client in own tenant (201)")

        # Test 25: gym_admin cannot create super_admin
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_fake_super@fitsphere.test",
                "password": "Password123!",
                "role": "super_admin",
                "tenant_id": None,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 25. gym_admin cannot create super_admin (403)")

        # Test 26: gym_admin cannot create gym_admin
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_peer_admin@fitsphere.test",
                "password": "Password123!",
                "role": "gym_admin",
                "tenant_id": gym_a.id,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 26. gym_admin cannot create gym_admin (403)")

        # Test 27: gym_admin cannot create user in another tenant
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_rogue_client@fitsphere.test",
                "password": "Password123!",
                "role": "client",
                "tenant_id": gym_b.id,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 27. gym_admin cannot create user in another tenant (403)")

        # Test 28: coach cannot create user
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_coach_sub@fitsphere.test",
                "password": "Password123!",
                "role": "client",
                "tenant_id": gym_a.id,
            },
            headers=auth_header(gym_a_coach.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 28. coach cannot create user (403)")

        # Test 29: client cannot create user
        res = client.post(
            "/api/v1/users/",
            json={
                "email": f"{prefix}_client_sub@fitsphere.test",
                "password": "Password123!",
                "role": "client",
                "tenant_id": gym_a.id,
            },
            headers=auth_header(gym_a_client.id),
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("  [PASS] 29. client cannot create user (403)")

        # ==========================================
        # LIVE-STATE TESTS (30 - 32)
        # ==========================================
        print("\n=== LIVE-STATE DATABASE TESTS ===")

        # Test 30: Inactive user cannot access protected endpoints
        # Issue valid token for gym_a_client, then deactivate in DB
        client_token_header = auth_header(gym_a_client.id)
        # Check that it works initially
        res = client.get("/api/v1/auth/me", headers=client_token_header)
        assert res.status_code == 200
        # Deactivate in PostgreSQL
        gym_a_client.is_active = False
        db.commit()
        # Immediate call using same token must be rejected with 403
        res = client.get("/api/v1/auth/me", headers=client_token_header)
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Inactive user account"
        # Reactivate
        gym_a_client.is_active = True
        db.commit()
        print("  [PASS] 30. inactive user immediately rejected on protected endpoints without token change (403)")

        # Test 31: Role changed in database is immediately respected
        # Create a user with role 'client'
        promo_user = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_promo@fitsphere.test",
                password="Password123!",
                role=UserRole.CLIENT,
                tenant_id=gym_a.id,
            )
        )
        promo_token_header = auth_header(promo_user.id)
        # As client, cannot list users
        res = client.get("/api/v1/users/", headers=promo_token_header)
        assert res.status_code == 403
        # Promote to gym_admin in DB directly
        promo_user.role = UserRole.GYM_ADMIN.value
        db.commit()
        # Immediately re-request with same token: now allowed to list users!
        res = client.get("/api/v1/users/", headers=promo_token_header)
        assert res.status_code == 200, f"Expected 200 after promotion, got {res.status_code}: {res.text}"
        print("  [PASS] 31. role change in database is immediately respected by protected routes")

        # Test 32: Tenant changed in database is immediately respected
        # User is in Gym A, can retrieve Gym A tenant
        res = client.get(f"/api/v1/tenants/{gym_a.id}", headers=promo_token_header)
        assert res.status_code == 200
        # Transfer user to Gym B in PostgreSQL directly
        promo_user.tenant_id = gym_b.id
        db.commit()
        # Immediate check with same token: can no longer retrieve Gym A (403), can now retrieve Gym B (200)!
        res_a = client.get(f"/api/v1/tenants/{gym_a.id}", headers=promo_token_header)
        assert res_a.status_code == 403, f"Expected 403 for old tenant, got {res_a.status_code}"
        res_b = client.get(f"/api/v1/tenants/{gym_b.id}", headers=promo_token_header)
        assert res_b.status_code == 200, f"Expected 200 for new tenant, got {res_b.status_code}"
        print("  [PASS] 32. tenant change in database is immediately respected by isolation boundary")

        print("\n=======================================================")
        print(">>> ALL 32 RBAC & AUTHORIZATION TESTS PASSED! <<<")
        print("=======================================================")

    finally:
        # Cleanup test records
        try:
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.name.like(f"%{prefix}%")).delete(synchronize_session=False)
            db.commit()
            print("[*] Cleaned up test data.")
        except Exception as e:
            print(f"[!] Cleanup warning: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
