"""
FitSphere Progress Tracking End-to-End Live Workflow Verification
Tests the complete end-to-end lifecycle flow:
Coach Mike
  ↓
Selects Alex Rivera
  ↓
Logs a progress record with measurements & session/plan link
  ↓
Client Alex logs in, views progress records, history, & summary stats
  ↓
Client Alex attempts mutation and receives 403 Forbidden
  ↓
Gym Admin audits progress records in facility
  ↓
Super Admin audits progress records platform-wide
  ↓
Coach Mike updates record notes
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient, email: str, password: str, expected_role: str):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    data = res.json()
    token = data["access_token"]
    user = data["user"]
    assert user["role"] == expected_role, f"Expected role {expected_role}, got {user['role']}"
    print(f"  [PASS] Logged in as {email} ({expected_role})")
    return {"Authorization": f"Bearer {token}"}, user


def run_flow_test():
    client = TestClient(app)
    print("=== STARTING FULL END-TO-END PROGRESS LIFECYCLE FLOW ===")

    # 1. Coach Mike logs in
    print("\n--- Step 1: Coach Mike Authentication ---")
    mike_auth, mike_user = login(client, "coach.mike@fitsphere.io", "Coach123!", "coach")

    # Fetch Coach Mike's assigned clients
    r_assign = client.get("/api/v1/assignments/", headers=mike_auth)
    assert r_assign.status_code == 200, f"Failed getting assignments: {r_assign.text}"
    assignments = r_assign.json()
    assert len(assignments) >= 1, "Coach Mike should have at least 1 active client assignment"
    alex_assignment = next((a for a in assignments if a["client"]["email"] == "client.alex@fitsphere.io"), None)
    assert alex_assignment is not None, "Alex Rivera should be an assigned client of Coach Mike"
    alex_id = alex_assignment["client"]["id"]
    print(f"  [PASS] Coach Mike verified active client assignment with Alex Rivera ({alex_id})")

    # 2. Coach Mike logs a progress record for Alex
    print("\n--- Step 2: Coach Mike Logs Progress Record ---")
    now_utc = datetime.now(timezone.utc)
    record_payload = {
        "client_id": alex_id,
        "recorded_at": now_utc.isoformat(),
        "weight_kg": 81.20,
        "body_fat_percentage": 17.80,
        "chest_cm": 103.50,
        "waist_cm": 83.00,
        "hip_cm": 98.00,
        "arm_cm": 37.50,
        "thigh_cm": 59.00,
        "notes": "E2E Flow Check-in: Excellent hypertrophy progress and reduced waist circumference.",
    }
    r_create = client.post("/api/v1/progress/", json=record_payload, headers=mike_auth)
    assert r_create.status_code == 201, f"Failed creating progress record: {r_create.text}"
    record_data = r_create.json()
    record_id = record_data["id"]
    assert float(record_data["weight_kg"]) == 81.20
    print(f"  [PASS] Created progress record {record_id} for Alex Rivera")

    # 3. Client Alex logs in and reviews his progress
    print("\n--- Step 3: Client Alex Verifies Progress Views ---")
    alex_auth, alex_user = login(client, "client.alex@fitsphere.io", "Client123!", "client")

    # Client list view
    r_client_list = client.get("/api/v1/progress/", headers=alex_auth)
    assert r_client_list.status_code == 200, f"Client failed getting records: {r_client_list.text}"
    client_records = r_client_list.json()
    assert any(r["id"] == record_id for r in client_records), "Alex's newly created record should appear in his list"
    print(f"  [PASS] Client Alex successfully retrieved {len(client_records)} personal progress records")

    # Client history view
    r_client_history = client.get(f"/api/v1/progress/clients/{alex_id}/history", headers=alex_auth)
    assert r_client_history.status_code == 200, f"Failed getting history: {r_client_history.text}"
    history_records = r_client_history.json()
    assert len(history_records) >= 1
    print(f"  [PASS] Client Alex retrieved personal history timeline ({len(history_records)} entries)")

    # Client summary view
    r_client_summary = client.get(f"/api/v1/progress/clients/{alex_id}/latest", headers=alex_auth)
    assert r_client_summary.status_code == 200, f"Failed getting summary: {r_client_summary.text}"
    summary = r_client_summary.json()
    assert summary["latest_record"] is not None
    assert summary["total_records"] >= 1
    print(f"  [PASS] Client Alex retrieved summary stats (Total records: {summary['total_records']}, Latest weight: {summary['latest_record']['weight_kg']} kg)")

    # 4. Client Alex tries to mutate and receives 403
    print("\n--- Step 4: Verify Client Mutation Rejection ---")
    r_client_post = client.post("/api/v1/progress/", json=record_payload, headers=alex_auth)
    assert r_client_post.status_code == 403, f"Expected 403 for client create, got {r_client_post.status_code}"

    r_client_patch = client.patch(f"/api/v1/progress/{record_id}", json={"notes": "Hacked"}, headers=alex_auth)
    assert r_client_patch.status_code == 403, f"Expected 403 for client patch, got {r_client_patch.status_code}"

    r_client_delete = client.delete(f"/api/v1/progress/{record_id}", headers=alex_auth)
    assert r_client_delete.status_code == 403, f"Expected 403 for client delete, got {r_client_delete.status_code}"
    print("  [PASS] Client Alex strictly forbidden from create, update, and delete (403 Forbidden)")

    # 5. Gym Admin audits facility progress
    print("\n--- Step 5: Gym Admin Facility Audit ---")
    admin_auth, admin_user = login(client, "gymadmin@fitsphere.io", "GymAdmin123!", "gym_admin")
    r_admin_list = client.get("/api/v1/progress/", headers=admin_auth)
    assert r_admin_list.status_code == 200, f"Gym Admin failed to list: {r_admin_list.text}"
    assert any(r["id"] == record_id for r in r_admin_list.json())
    print(f"  [PASS] Gym Admin successfully audited {len(r_admin_list.json())} facility progress records")

    # 6. Super Admin audits platform progress
    print("\n--- Step 6: Super Admin Platform Audit ---")
    super_auth, super_user = login(client, "superadmin@fitsphere.io", "SuperAdmin123!", "super_admin")
    r_super_list = client.get("/api/v1/progress/", headers=super_auth)
    assert r_super_list.status_code == 200, f"Super Admin failed to list: {r_super_list.text}"
    assert any(r["id"] == record_id for r in r_super_list.json())
    print(f"  [PASS] Super Admin successfully audited {len(r_super_list.json())} platform-wide progress records")

    # 7. Coach Mike updates record
    print("\n--- Step 7: Coach Mike Updates Record ---")
    r_update = client.patch(
        f"/api/v1/progress/{record_id}",
        json={"notes": "Updated post-workout check-in with verified body calipers."},
        headers=mike_auth,
    )
    assert r_update.status_code == 200
    assert "verified body calipers" in r_update.json()["notes"]
    print(f"  [PASS] Coach Mike updated notes on record {record_id}")

    print("\n========================================================")
    print("✓ END-TO-END PROGRESS LIFECYCLE FLOW COMPLETED SUCCESSFULLY")
    print("========================================================\n")


if __name__ == "__main__":
    run_flow_test()
