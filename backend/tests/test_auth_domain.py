"""
FitSphere - Authentication Domain Comprehensive Verification Suite
Tests all 10 invariants:
1. Valid login returns 200, JWT access token, and UserRead.
2. Wrong password returns 401 "Incorrect email or password".
3. Unknown email returns identical 401 "Incorrect email or password".
4. Email normalization / case-insensitivity on login.
5. Inactive user returns 403 "Inactive user account".
6. GET /api/v1/auth/me with valid Bearer token returns 200 and user profile.
7. GET /api/v1/auth/me with expired token returns 401 "Token has expired".
8. GET /api/v1/auth/me with tampered / invalid token returns 401 "Could not validate credentials".
9. GET /api/v1/auth/me with missing Authorization header returns 401.
10. Tenant context and role authorization:
    - Super-admin gets tenant_id = None
    - Gym-admin gets valid tenant_id
    - RoleChecker enforces permissions correctly
"""
import uuid
from datetime import timedelta
from fastapi.testclient import TestClient
from jose import jwt

from app.api.deps import (
    get_current_active_user,
    get_current_tenant_id,
    require_gym_admin,
    require_super_admin,
)
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.users.service import user_service


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"auth_test_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting authentication verification suite with prefix: {prefix}")

    try:
        # Setup: Create a Tenant
        test_tenant = Tenant(
            id=str(uuid.uuid4()),
            name=f"Auth Test Gym {prefix}",
            slug=f"auth-test-gym-{prefix}",
            is_active=True,
        )
        db.add(test_tenant)
        db.commit()
        db.refresh(test_tenant)
        print(f"[+] Created test tenant: {test_tenant.id}")

        # Setup: Create active gym_admin user
        admin_email = f"{prefix}_admin@fitsphere.test"
        admin_raw_password = "SecurePassword123!"
        from app.modules.users.schemas import UserCreate
        admin_user = user_service.create(
            db,
            obj_in=UserCreate(
                email=admin_email,
                password=admin_raw_password,
                full_name="Admin User",
                role=UserRole.GYM_ADMIN,
                tenant_id=test_tenant.id,
            )
        )
        print(f"[+] Created active gym_admin user: {admin_user.id} ({admin_user.email})")

        # Setup: Create inactive client user
        inactive_email = f"{prefix}_inactive@fitsphere.test"
        inactive_raw_password = "InactivePassword123!"
        inactive_user = user_service.create(
            db,
            obj_in=UserCreate(
                email=inactive_email,
                password=inactive_raw_password,
                full_name="Inactive User",
                role=UserRole.CLIENT,
                tenant_id=test_tenant.id,
            )
        )
        # Manually deactivate
        inactive_user.is_active = False
        db.commit()
        db.refresh(inactive_user)
        print(f"[+] Created inactive client user: {inactive_user.id}")

        # Setup: Create super_admin user (tenant_id = None)
        super_email = f"{prefix}_super@fitsphere.test"
        super_raw_password = "SuperPassword123!"
        super_user = user_service.create(
            db,
            obj_in=UserCreate(
                email=super_email,
                password=super_raw_password,
                full_name="Super Admin User",
                role=UserRole.SUPER_ADMIN,
                tenant_id=None,
            )
        )
        print(f"[+] Created super_admin user: {super_user.id}")

        # Test 1: Valid login
        print("\n--- Test 1: Valid Login ---")
        res = client.post("/api/v1/auth/login", json={
            "email": admin_email,
            "password": admin_raw_password
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "access_token" in data, "Token missing from response"
        assert data["token_type"] == "bearer", f"Expected bearer token, got {data['token_type']}"
        assert data["user"]["email"] == admin_email
        assert data["user"]["role"] == "gym_admin"
        assert "password" not in data["user"]
        assert "hashed_password" not in data["user"]
        admin_token = data["access_token"]
        print("  [PASS] Valid login issued JWT access token and safe UserRead object")

        # Test 2: Wrong password
        print("\n--- Test 2: Wrong Password ---")
        res = client.post("/api/v1/auth/login", json={
            "email": admin_email,
            "password": "WrongPassword999!"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Incorrect email or password"
        assert "Bearer" in res.headers.get("www-authenticate", "")
        print("  [PASS] Wrong password returned 401 'Incorrect email or password'")

        # Test 3: Unknown email
        print("\n--- Test 3: Unknown Email ---")
        res = client.post("/api/v1/auth/login", json={
            "email": f"unknown_{prefix}@fitsphere.test",
            "password": "AnyPassword123!"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Incorrect email or password"
        print("  [PASS] Unknown email returned identical 401 error message to prevent enumeration")

        # Test 4: Email normalization and case-insensitivity
        print("\n--- Test 4: Email Normalization & Case-Insensitivity ---")
        res = client.post("/api/v1/auth/login", json={
            "email": f"  {admin_email.upper()}  ",
            "password": admin_raw_password
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["user"]["email"] == admin_email
        print("  [PASS] Uppercase/trimmed email logged in successfully")

        # Test 5: Inactive user
        print("\n--- Test 5: Inactive User Rejection ---")
        res = client.post("/api/v1/auth/login", json={
            "email": inactive_email,
            "password": inactive_raw_password
        })
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Inactive user account"
        print("  [PASS] Inactive user rejected with 403 'Inactive user account'")

        # Test 6: GET /api/v1/auth/me with valid Bearer token
        print("\n--- Test 6: GET /api/v1/auth/me with Valid Token ---")
        res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        me_data = res.json()
        assert me_data["id"] == admin_user.id
        assert me_data["email"] == admin_email
        assert me_data["tenant_id"] == test_tenant.id
        assert "hashed_password" not in me_data
        print(f"  [PASS] Current user profile fetched successfully for {me_data['email']}")

        # Test 7: GET /api/v1/auth/me with expired token
        print("\n--- Test 7: Expired Token ---")
        expired_token = create_access_token(
            subject=admin_user.id,
            expires_delta=timedelta(seconds=-10)  # already expired
        )
        res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Token has expired"
        print("  [PASS] Expired token returned 401 'Token has expired'")

        # Test 8: GET /api/v1/auth/me with tampered / invalid token
        print("\n--- Test 8: Tampered Token ---")
        fake_token = jwt.encode(
            {"sub": admin_user.id, "type": "access", "exp": 9999999999, "iat": 1000000000},
            "completely_wrong_secret_key",
            algorithm="HS256"
        )
        res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {fake_token}"}
        )
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        assert res.json()["detail"] == "Could not validate credentials"
        print("  [PASS] Tampered token returned 401 'Could not validate credentials'")

        # Test 9: Missing Authorization header
        print("\n--- Test 9: Missing Authorization Header ---")
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        print("  [PASS] Missing Authorization header returned 401")

        # Test 10: Tenant Context and Role Authorization
        print("\n--- Test 10: Tenant Context & Role-Checker ---")
        # Direct dependency test for super_admin
        tenant_id_super = get_current_tenant_id(super_user)
        assert tenant_id_super is None, f"Expected None for super_admin tenant_id, got {tenant_id_super}"
        print("  [PASS] Super-admin tenant context resolves to None (platform scope)")

        # Direct dependency test for gym_admin
        tenant_id_admin = get_current_tenant_id(admin_user)
        assert tenant_id_admin == test_tenant.id, f"Expected {test_tenant.id}, got {tenant_id_admin}"
        print(f"  [PASS] Gym-admin tenant context resolves to tenant UUID ({tenant_id_admin})")

        # Role checker tests
        # super_admin passes require_super_admin
        checked_super = require_super_admin(super_user)
        assert checked_super.id == super_user.id
        print("  [PASS] require_super_admin allows super_admin")

        # gym_admin is rejected by require_super_admin
        try:
            require_super_admin(admin_user)
            assert False, "require_super_admin should have raised 403 for gym_admin"
        except Exception as e:
            from fastapi import HTTPException
            assert isinstance(e, HTTPException)
            assert e.status_code == 403
            assert e.detail == "Operation not permitted for your user role"
            print("  [PASS] require_super_admin rejects gym_admin with 403 Forbidden")

        # gym_admin passes require_gym_admin
        checked_admin = require_gym_admin(admin_user)
        assert checked_admin.id == admin_user.id
        print("  [PASS] require_gym_admin allows gym_admin")

        print("\n=======================================================")
        print(">>> ALL 10 AUTHENTICATION TEST SCENARIOS PASSED! <<<")
        print("=======================================================")

    finally:
        # Clean up test records
        try:
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.slug.like(f"%{prefix}%")).delete(synchronize_session=False)
            db.commit()
            print("[*] Test data cleaned up successfully.")
        except Exception as e:
            print(f"[!] Cleanup warning: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
