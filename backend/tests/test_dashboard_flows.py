"""
FitSphere App Shell & Role Dashboards End-to-End API Integration Verification
Tests all endpoints consumed by:
- LoginPage
- AppShell & TopBar
- GymAdminDashboard
- CoachDashboard
- ClientDashboard
- SuperAdminDashboard
"""
import httpx
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_login(client: httpx.Client, email, password, expected_role):
    resp = client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.status_code} {resp.text}"
    data = resp.json()
    token = data["access_token"]
    user = data["user"]
    assert user["role"] == expected_role, f"Expected role {expected_role}, got {user['role']}"
    print(f"  [PASS] Logged in as {email} ({expected_role})")
    return token, user

def run_suite():
    with httpx.Client(timeout=10.0) as client:
        print("=== 1. VERIFYING SUPER ADMIN FLOW & DASHBOARD APIS ===")
        token, _ = test_login(client, "superadmin@fitsphere.io", "SuperAdmin123!", "super_admin")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Platform Tenants
        r_tenants = client.get(f"{BASE_URL}/tenants/", headers=headers)
        assert r_tenants.status_code == 200, f"Failed tenants: {r_tenants.text}"
        tenants = r_tenants.json()
        print(f"  [PASS] Super Admin fetched {len(tenants)} tenants")

        # 2. Platform Users
        r_users = client.get(f"{BASE_URL}/users/", headers=headers)
        assert r_users.status_code == 200, f"Failed users: {r_users.text}"
        users = r_users.json()
        print(f"  [PASS] Super Admin fetched {len(users)} platform users")

        # 3. Platform Assignments
        r_assign = client.get(f"{BASE_URL}/assignments/", headers=headers)
        assert r_assign.status_code == 200, f"Failed assignments: {r_assign.text}"
        assigns = r_assign.json()
        print(f"  [PASS] Super Admin fetched {len(assigns)} assignments")

        print("\n=== 2. VERIFYING GYM ADMIN FLOW & DASHBOARD APIS ===")
        token, user = test_login(client, "gymadmin@fitsphere.io", "GymAdmin123!", "gym_admin")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Own Tenant
        tenant_id = user["tenant_id"]
        r_tenant = client.get(f"{BASE_URL}/tenants/{tenant_id}", headers=headers)
        assert r_tenant.status_code == 200, f"Failed tenant by ID: {r_tenant.text}"
        tenant = r_tenant.json()
        assert tenant["name"] == "PowerFit Gym", f"Expected PowerFit Gym, got {tenant['name']}"
        print(f"  [PASS] Gym Admin fetched own tenant: {tenant['name']} (slug: {tenant['slug']})")

        # 2. Same-tenant Coaches
        r_coaches = client.get(f"{BASE_URL}/users/?role=coach", headers=headers)
        assert r_coaches.status_code == 200, f"Failed coaches: {r_coaches.text}"
        coaches = r_coaches.json()
        print(f"  [PASS] Gym Admin fetched {len(coaches)} coaches in tenant")

        # 3. Same-tenant Clients
        r_clients = client.get(f"{BASE_URL}/users/?role=client", headers=headers)
        assert r_clients.status_code == 200, f"Failed clients: {r_clients.text}"
        clients = r_clients.json()
        print(f"  [PASS] Gym Admin fetched {len(clients)} clients in tenant")

        # 4. Same-tenant Assignments
        r_assign = client.get(f"{BASE_URL}/assignments/", headers=headers)
        assert r_assign.status_code == 200, f"Failed assignments: {r_assign.text}"
        assignments = r_assign.json()
        print(f"  [PASS] Gym Admin fetched {len(assignments)} assignments in tenant")

        print("\n=== 3. VERIFYING COACH FLOW & DASHBOARD APIS ===")
        token, _ = test_login(client, "coach.mike@fitsphere.io", "Coach123!", "coach")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Assigned Clients via GET /assignments/
        r_my_clients = client.get(f"{BASE_URL}/assignments/", headers=headers)
        assert r_my_clients.status_code == 200, f"Failed assignments: {r_my_clients.text}"
        my_clients = r_my_clients.json()
        print(f"  [PASS] Coach Mike fetched {len(my_clients)} assigned clients")
        if my_clients and my_clients[0].get("client"):
            c = my_clients[0]["client"]
            print(f"         First assigned client: {c.get('full_name')} ({c.get('email')})")

        print("\n=== 4. VERIFYING CLIENT FLOW & DASHBOARD APIS ===")
        token, _ = test_login(client, "client.alex@fitsphere.io", "Client123!", "client")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Assigned Coaches via GET /assignments/
        r_my_coaches = client.get(f"{BASE_URL}/assignments/", headers=headers)
        assert r_my_coaches.status_code == 200, f"Failed assignments: {r_my_coaches.text}"
        my_coaches = r_my_coaches.json()
        print(f"  [PASS] Client Alex fetched {len(my_coaches)} assigned coaches")
        if my_coaches and my_coaches[0].get("coach"):
            co = my_coaches[0]["coach"]
            print(f"         Assigned coach: {co.get('full_name')} ({co.get('email')})")

        print("\n=======================================================")
        print(">>> ALL DASHBOARD & APP SHELL API FLOWS VERIFIED! <<<")
        print("=======================================================")

if __name__ == "__main__":
    run_suite()
