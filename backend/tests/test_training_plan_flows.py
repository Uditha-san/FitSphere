"""
FitSphere Training Plans End-to-End Live API Verification
Tests live endpoints consumed by frontend for:
- CoachTrainingPlansView
- ClientTrainingPlanView
- GymAdminTrainingPlansView
- SuperAdminTrainingPlansView
"""
import httpx

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
        print("=== 1. VERIFYING COACH FLOW & TRAINING PLAN APIS ===")
        token, _ = test_login(client, "coach.mike@fitsphere.io", "Coach123!", "coach")
        headers = {"Authorization": f"Bearer {token}"}

        # List plans
        r_plans = client.get(f"{BASE_URL}/training-plans/", headers=headers)
        assert r_plans.status_code == 200, f"Failed list: {r_plans.text}"
        plans = r_plans.json()
        assert len(plans) >= 1, "Expected at least 1 plan for Coach Mike"
        plan = plans[0]
        print(f"  [PASS] Coach Mike listed {len(plans)} plan(s): '{plan['name']}' (status: {plan['status']})")

        # Get plan details
        r_detail = client.get(f"{BASE_URL}/training-plans/{plan['id']}", headers=headers)
        assert r_detail.status_code == 200, f"Failed details: {r_detail.text}"
        detail = r_detail.json()
        days = detail["workout_days"]
        assert len(days) >= 2, f"Expected >= 2 workout days, got {len(days)}"
        print(f"  [PASS] Coach Mike fetched details with {len(days)} workout day(s):")
        for d in days:
            print(f"         - {d['name']} ({len(d['exercises'])} exercises)")

        print("\n=== 2. VERIFYING CLIENT FLOW & TRAINING PLAN APIS ===")
        token, _ = test_login(client, "client.alex@fitsphere.io", "Client123!", "client")
        headers = {"Authorization": f"Bearer {token}"}

        # Client lists own plans
        r_client_plans = client.get(f"{BASE_URL}/training-plans/", headers=headers)
        assert r_client_plans.status_code == 200, f"Failed client plans: {r_client_plans.text}"
        c_plans = r_client_plans.json()
        assert len(c_plans) >= 1, "Expected at least 1 plan for Client Alex"
        print(f"  [PASS] Client Alex listed {len(c_plans)} plan(s): '{c_plans[0]['name']}'")

        # Client fetches full details
        r_client_detail = client.get(f"{BASE_URL}/training-plans/{c_plans[0]['id']}", headers=headers)
        assert r_client_detail.status_code == 200
        c_detail = r_client_detail.json()
        assert c_detail["coach"]["email"] == "coach.mike@fitsphere.io"
        print(f"  [PASS] Client Alex successfully retrieved workouts prescribed by {c_detail['coach']['full_name']}")

        print("\n=== 3. VERIFYING GYM ADMIN FLOW & AUDIT APIS ===")
        token, _ = test_login(client, "gymadmin@fitsphere.io", "GymAdmin123!", "gym_admin")
        headers = {"Authorization": f"Bearer {token}"}

        r_gym_plans = client.get(f"{BASE_URL}/training-plans/", headers=headers)
        assert r_gym_plans.status_code == 200
        gym_plans = r_gym_plans.json()
        assert len(gym_plans) >= 1
        print(f"  [PASS] Gym Admin audited {len(gym_plans)} training plan(s) inside PowerFit Gym")

        print("\n=== 4. VERIFYING SUPER ADMIN PLATFORM FLOW ===")
        token, _ = test_login(client, "superadmin@fitsphere.io", "SuperAdmin123!", "super_admin")
        headers = {"Authorization": f"Bearer {token}"}

        r_super_plans = client.get(f"{BASE_URL}/training-plans/", headers=headers)
        assert r_super_plans.status_code == 200
        super_plans = r_super_plans.json()
        print(f"  [PASS] Super Admin audited {len(super_plans)} platform-wide training plan(s)")

        print("\n=======================================================")
        print(">>> ALL TRAINING PLAN LIVE API FLOWS VERIFIED! <<<")
        print("=======================================================")

if __name__ == "__main__":
    run_suite()
