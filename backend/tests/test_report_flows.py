"""
FitSphere - Reports & Analytics End-to-End Multi-Role User Flow
Uses seeded application domain data to verify:
 1. Coach Mike logs in, accesses coach overview and assigned client statistics
 2. Coach Mike accesses athlete Alex Rivera's detailed report (training & progress metrics)
 3. Client Alex Rivera logs in and accesses personal reports (overview, progress, training)
 4. Client Alex attempts to access another client's report and is blocked (403 Forbidden)
 5. Gym Admin logs in and audits facility-wide overview, clients activity, coaches performance, and sessions
 6. Super Admin logs in, accesses platform-wide analytics, audits gyms summary, and inspects specific tenant report
"""

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.tenants.models import Tenant
from app.modules.users.models import User


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_e2e_flow():
    client = TestClient(app)
    db = SessionLocal()

    print("[*] Starting Reports & Analytics End-to-End Multi-Role Flow...")

    try:
        # Locate seeded users
        coach_mike = db.scalar(select(User).where(User.email == "coach.mike@fitsphere.io"))
        client_alex = db.scalar(select(User).where(User.email == "client.alex@fitsphere.io"))
        gym_admin = db.scalar(select(User).where(User.email == "gymadmin@fitsphere.io"))
        super_admin = db.scalar(select(User).where(User.email == "superadmin@fitsphere.io"))
        powerfit_gym = db.get(Tenant, gym_admin.tenant_id) if gym_admin else None

        assert coach_mike, "Seeded coach.mike@fitsphere.io not found"
        assert client_alex, "Seeded client.alex@fitsphere.io not found"
        assert gym_admin, "Seeded gymadmin@fitsphere.io not found"
        assert super_admin, "Seeded superadmin@fitsphere.io not found"
        assert powerfit_gym, "Seeded PowerFit Gym tenant not found"

        # ---------------------------------------------------------------------
        # Step 1: Coach Mike accesses coach overview
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/coach/overview", headers=auth_header(coach_mike.id))
        assert r.status_code == 200, f"Step 1 failed: {r.text}"
        coach_ov = r.json()
        assert coach_ov["coach_id"] == coach_mike.id
        assert coach_ov["total_assigned_clients"] >= 1
        print(f"✓ Step 1: Coach Mike overview fetched (Athletes: {coach_ov['total_assigned_clients']}, Active Plans: {coach_ov['active_training_plans']})")

        # ---------------------------------------------------------------------
        # Step 2: Coach Mike accesses athlete roster & inspects Alex Rivera
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/coach/clients", headers=auth_header(coach_mike.id))
        assert r.status_code == 200, f"Step 2a failed: {r.text}"
        roster = r.json()
        assert any(c["client_id"] == client_alex.id for c in roster)

        r = client.get(f"/api/v1/reports/coach/clients/{client_alex.id}", headers=auth_header(coach_mike.id))
        assert r.status_code == 200, f"Step 2b failed: {r.text}"
        alex_report_for_coach = r.json()
        assert alex_report_for_coach["client_id"] == client_alex.id
        assert alex_report_for_coach["assigned_coach"]["id"] == coach_mike.id
        print(f"✓ Step 2: Coach Mike inspected assigned athlete Alex Rivera's report (Sessions: {alex_report_for_coach['session_stats']['total']})")

        # ---------------------------------------------------------------------
        # Step 3: Client Alex Rivera accesses personal reports
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/client/overview", headers=auth_header(client_alex.id))
        assert r.status_code == 200, f"Step 3a failed: {r.text}"
        alex_ov = r.json()
        assert alex_ov["client_id"] == client_alex.id
        assert alex_ov["assigned_coach"]["full_name"] == coach_mike.full_name

        r = client.get("/api/v1/reports/client/progress", headers=auth_header(client_alex.id))
        assert r.status_code == 200, f"Step 3b failed: {r.text}"
        alex_prog = r.json()
        assert "weight" in alex_prog

        r = client.get("/api/v1/reports/client/training", headers=auth_header(client_alex.id))
        assert r.status_code == 200, f"Step 3c failed: {r.text}"
        alex_train = r.json()
        assert "completion_rate" in alex_train["session_stats"]
        print(f"✓ Step 3: Client Alex accessed personal Overview, Progress ({alex_prog['total_records']} logs), and Training reports")

        # ---------------------------------------------------------------------
        # Step 4: Client Alex attempts unauthorized cross-client access
        # ---------------------------------------------------------------------
        # Try requesting coach Mike's ID or dummy client
        dummy_client_id = "00000000-0000-0000-0000-000000000000"
        r = client.get(f"/api/v1/reports/client/overview?client_id={dummy_client_id}", headers=auth_header(client_alex.id))
        assert r.status_code == 403, f"Step 4 failed: {r.text}"
        print("✓ Step 4: Client Alex blocked from unauthorized client query (403 Forbidden)")

        # ---------------------------------------------------------------------
        # Step 5: Gym Admin audits facility-wide operations
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/gym/overview", headers=auth_header(gym_admin.id))
        assert r.status_code == 200, f"Step 5a failed: {r.text}"
        gym_ov = r.json()
        assert gym_ov["tenant_id"] == powerfit_gym.id
        assert gym_ov["total_clients"] >= 1
        assert gym_ov["total_coaches"] >= 1

        r = client.get("/api/v1/reports/gym/clients", headers=auth_header(gym_admin.id))
        assert r.status_code == 200, f"Step 5b failed: {r.text}"
        assert len(r.json()) >= 1

        r = client.get("/api/v1/reports/gym/coaches", headers=auth_header(gym_admin.id))
        assert r.status_code == 200, f"Step 5c failed: {r.text}"
        assert any(c["coach_id"] == coach_mike.id for c in r.json())

        r = client.get("/api/v1/reports/gym/sessions", headers=auth_header(gym_admin.id))
        assert r.status_code == 200, f"Step 5d failed: {r.text}"
        print(f"✓ Step 5: Gym Admin audited PowerFit Gym (Members: {gym_ov['total_clients']}, Coaches: {gym_ov['total_coaches']}, Sessions: {gym_ov['session_stats']['total']})")

        # ---------------------------------------------------------------------
        # Step 6: Super Admin platform-wide oversight & specific tenant audit
        # ---------------------------------------------------------------------
        r = client.get("/api/v1/reports/super-admin/overview", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Step 6a failed: {r.text}"
        plat_ov = r.json()
        assert plat_ov["total_gyms"] >= 1
        assert plat_ov["total_users"] >= 3

        r = client.get(f"/api/v1/reports/super-admin/gyms?search={powerfit_gym.slug}", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Step 6b failed: {r.text}"
        assert any(g["tenant_id"] == powerfit_gym.id for g in r.json())

        r = client.get(f"/api/v1/reports/super-admin/gyms/{powerfit_gym.id}", headers=auth_header(super_admin.id))
        assert r.status_code == 200, f"Step 6c failed: {r.text}"
        assert r.json()["tenant_id"] == powerfit_gym.id
        print(f"✓ Step 6: Super Admin audited Platform Overview (Gyms: {plat_ov['total_gyms']}, Users: {plat_ov['total_users']}) and PowerFit tenant")

        print("\n========================================================")
        print("✓ ALL 6 END-TO-END REPORT FLOW STEPS PASSED SUCCESSFULLY")
        print("========================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_e2e_flow()
