"""
FitSphere Schedule & Sessions End-to-End Live Workflow Verification
Tests the complete end-to-end lifecycle flow:
Coach Mike
  ↓
Selects Alex Rivera
  ↓
Creates a session
  ↓
Links an existing training plan / workout day
  ↓
Confirms session
  ↓
Starts session
  ↓
Completes session
  ↓
Client Alex views the session as completed
  ↓
Gym Admin audits session in facility
  ↓
Super Admin audits session across platform
"""

from datetime import datetime, timedelta, timezone
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
    print("=== STARTING FULL END-TO-END SESSION LIFECYCLE FLOW ===")

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

    # Fetch Coach Mike's training plans for Alex
    r_plans = client.get("/api/v1/training-plans/", headers=mike_auth)
    assert r_plans.status_code == 200
    plans = r_plans.json()
    assert len(plans) >= 1, "Expected at least 1 training plan"
    plan = plans[0]

    # Fetch workout days for this plan
    r_plan_detail = client.get(f"/api/v1/training-plans/{plan['id']}", headers=mike_auth)
    assert r_plan_detail.status_code == 200
    plan_detail = r_plan_detail.json()
    days = plan_detail.get("workout_days", [])
    workout_day_id = days[0]["id"] if days else None
    print(f"  [PASS] Coach Mike resolved training plan '{plan['name']}' (Day: {days[0]['name'] if days else 'None'})")

    # Clean up any leftover test sessions between Mike and Alex
    session_id = None
    from app.db.session import SessionLocal
    from app.modules.sessions.models import TrainingSession
    cleanup_db = SessionLocal()
    try:
        cleanup_db.query(TrainingSession).filter(
            TrainingSession.coach_id == mike_user["id"],
            TrainingSession.client_id == alex_id
        ).delete(synchronize_session=False)
        cleanup_db.commit()
    finally:
        cleanup_db.close()

    try:
        # 2. Coach Mike creates a session for Alex Rivera
        print("\n--- Step 2: Session Creation ---")
        session_start = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(days=2, hours=9)
        session_end = session_start + timedelta(hours=1)

        payload = {
            "client_id": alex_id,
            "scheduled_start": session_start.isoformat(),
            "scheduled_end": session_end.isoformat(),
            "session_type": "personal_training",
            "notes": "Hypertrophy Push workout - Focus on chest and shoulder pressing mechanics",
            "training_plan_id": plan["id"],
            "workout_day_id": workout_day_id,
        }
        r_create = client.post("/api/v1/sessions/", json=payload, headers=mike_auth)
        assert r_create.status_code == 201, f"Failed session creation: {r_create.text}"
        session = r_create.json()
        session_id = session["id"]
        assert session["status"] == "scheduled"
        assert session["coach"]["email"] == "coach.mike@fitsphere.io"
        assert session["client"]["email"] == "client.alex@fitsphere.io"
        assert session["training_plan"]["id"] == plan["id"]
        print(f"  [PASS] Session successfully scheduled for Alex Rivera (ID: {session_id}, Status: scheduled)")

        # 3. Coach Mike advances session: confirm -> start -> complete
        print("\n--- Step 3: Lifecycle Progression ---")
        # Confirm
        r_confirm = client.post(f"/api/v1/sessions/{session_id}/confirm", headers=mike_auth)
        assert r_confirm.status_code == 200
        assert r_confirm.json()["status"] == "confirmed"
        print("  [PASS] Session confirmed by Coach Mike (Status: confirmed)")

        # Start
        r_start = client.post(f"/api/v1/sessions/{session_id}/start", headers=mike_auth)
        assert r_start.status_code == 200
        assert r_start.json()["status"] == "in_progress"
        print("  [PASS] Session started by Coach Mike (Status: in_progress)")

        # Complete
        r_complete = client.post(f"/api/v1/sessions/{session_id}/complete", headers=mike_auth)
        assert r_complete.status_code == 200
        completed_session = r_complete.json()
        assert completed_session["status"] == "completed"
        print("  [PASS] Session completed by Coach Mike (Status: completed)")

        # 4. Client Alex logs in and views the completed session
        print("\n--- Step 4: Client Alex Verification ---")
        alex_auth, alex_user = login(client, "client.alex@fitsphere.io", "Client123!", "client")

        r_client_sessions = client.get("/api/v1/sessions/", headers=alex_auth)
        assert r_client_sessions.status_code == 200
        alex_sessions = r_client_sessions.json()
        target_session = next((s for s in alex_sessions if s["id"] == session_id), None)
        assert target_session is not None, "Client Alex must see their completed session"
        assert target_session["status"] == "completed"
        assert target_session["training_plan"]["id"] == plan["id"]
        print(f"  [PASS] Client Alex verified session '{target_session['id']}' as completed with Coach Mike")

        # 5. Gym Admin audits session
        print("\n--- Step 5: Gym Admin Audit ---")
        admin_auth, admin_user = login(client, "gymadmin@fitsphere.io", "GymAdmin123!", "gym_admin")
        r_admin_sessions = client.get("/api/v1/sessions/", headers=admin_auth)
        assert r_admin_sessions.status_code == 200
        gym_sessions = r_admin_sessions.json()
        assert any(s["id"] == session_id for s in gym_sessions)
        print(f"  [PASS] Gym Admin verified session '{session_id}' in tenant facility overview")

        # 6. Super Admin platform-wide audit
        print("\n--- Step 6: Super Admin Platform Audit ---")
        super_auth, super_user = login(client, "superadmin@fitsphere.io", "SuperAdmin123!", "super_admin")
        r_super_sessions = client.get("/api/v1/sessions/", headers=super_auth)
        assert r_super_sessions.status_code == 200
        super_sessions = r_super_sessions.json()
        assert any(s["id"] == session_id for s in super_sessions)
        print(f"  [PASS] Super Admin verified session '{session_id}' in platform-wide audit")

    finally:
        # Clean up session created during flow
        if session_id:
            from app.db.session import SessionLocal
            from app.modules.sessions.models import TrainingSession
            db = SessionLocal()
            try:
                db.query(TrainingSession).filter(TrainingSession.id == session_id).delete(synchronize_session=False)
                db.commit()
                print("[*] Flow session cleaned up successfully.")
            except Exception as e:
                db.rollback()
                print(f"[!] Cleanup error: {e}")
            finally:
                db.close()

    print("\n=======================================================")
    print(">>> COMPLETE E2E SESSION LIFECYCLE FLOW VERIFIED! <<<")
    print("=======================================================")


if __name__ == "__main__":
    run_flow_test()
