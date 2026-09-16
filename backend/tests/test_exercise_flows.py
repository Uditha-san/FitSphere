"""
FitSphere - Exercise & Video Library End-to-End Multi-Role User Flow
Verifies real lifecycle across:
- Super Admin: Seeds platform movements with primary videos
- Gym Admin: Audits library and adds gym-custom movements
- Coach: Explores library and builds workout linking platform and custom exercises
- Client: Views their assigned workout and opens instructional technique videos
- Cross-tenant isolation verification
"""

import uuid
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.exercises.models import Exercise, ExerciseVideo
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import PlanStatus, TrainingPlan, WorkoutDay, WorkoutExercise
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_flow():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"flow_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Exercise & Video Library Flow with prefix: {prefix}")

    try:
        # 1. Tenants: Metro Fitness (Gym 1) & Apex Athletics (Gym 2)
        metro_gym = Tenant(
            id=str(uuid.uuid4()),
            name=f"Metro Fitness {prefix}",
            slug=f"metro-fitness-{prefix}",
            is_active=True,
        )
        apex_gym = Tenant(
            id=str(uuid.uuid4()),
            name=f"Apex Athletics {prefix}",
            slug=f"apex-athletics-{prefix}",
            is_active=True,
        )
        db.add_all([metro_gym, apex_gym])
        db.commit()

        # 2. Users
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                full_name="Global Platform Admin",
                role=UserRole.SUPER_ADMIN.value,
                tenant_id=None,
            ),
        )

        metro_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_metro_admin@fitsphere.test",
                password="Password123!",
                full_name="Metro Gym Admin",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=metro_gym.id,
            ),
        )

        metro_coach = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_metro_coach@fitsphere.test",
                password="Password123!",
                full_name="Metro Head Coach",
                role=UserRole.COACH.value,
                tenant_id=metro_gym.id,
            ),
        )

        metro_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_metro_client@fitsphere.test",
                password="Password123!",
                full_name="Metro Client Dave",
                role=UserRole.CLIENT.value,
                tenant_id=metro_gym.id,
            ),
        )

        apex_client = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_apex_client@fitsphere.test",
                password="Password123!",
                full_name="Apex Client Sara",
                role=UserRole.CLIENT.value,
                tenant_id=apex_gym.id,
            ),
        )

        # Coach Assignment
        assignment = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=metro_gym.id,
            coach_id=metro_coach.id,
            client_id=metro_client.id,
            is_active=True,
        )
        db.add(assignment)
        db.commit()

        # STEP 1: Super Admin creates standardized platform movement with primary tutorial video
        print("\n=== STEP 1: Super Admin Seeds Platform Library ===")
        res_platform = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Barbell Bench Press {prefix}",
                "description": "Standard barbell horizontal chest press.",
                "instructions": "Retract scapulae, touch mid-sternum, drive upward to full extension.",
                "muscle_group": "Chest",
                "secondary_muscle_group": "Triceps",
                "equipment": "Barbell",
                "difficulty": "intermediate",
                "exercise_type": "strength",
                "tenant_id": None,
                "videos": [
                    {
                        "title": "Master the Bench Press: Form Breakdown",
                        "description": "Elite technique guide with grip and arch cues",
                        "video_url": "https://www.youtube.com/watch?v=vcBig73ojpE",
                        "thumbnail_url": "https://img.youtube.com/vi/vcBig73ojpE/hqdefault.jpg",
                        "duration_seconds": 320,
                        "is_primary": True,
                    }
                ],
            },
            headers=auth_header(super_admin.id),
        )
        assert res_platform.status_code == 201, res_platform.text
        platform_ex = res_platform.json()
        assert platform_ex["tenant_id"] is None
        assert len(platform_ex["videos"]) == 1
        assert platform_ex["videos"][0]["is_primary"] is True
        print(f"  [+] Platform exercise created: '{platform_ex['name']}' (ID: {platform_ex['id']})")

        # STEP 2: Gym Admin views platform library and adds Metro-specific specialty exercise
        print("\n=== STEP 2: Gym Admin Browses Library & Adds Gym Movement ===")
        res_list = client.get("/api/v1/exercises/", headers=auth_header(metro_admin.id))
        assert res_list.status_code == 200
        assert any(e["id"] == platform_ex["id"] for e in res_list.json())
        print("  [+] Gym Admin successfully browsed platform library")

        res_metro_ex = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Metro Safety-Squat Bar Lunge {prefix}",
                "description": "Unilateral quadricep emphasis using safety squat bar",
                "instructions": "Step forward keeping upright torso with SSB handles secure.",
                "muscle_group": "Quads",
                "equipment": "Specialty Bar",
                "difficulty": "advanced",
                "exercise_type": "strength",
            },
            headers=auth_header(metro_admin.id),
        )
        assert res_metro_ex.status_code == 201, res_metro_ex.text
        metro_custom_ex = res_metro_ex.json()
        assert metro_custom_ex["tenant_id"] == metro_gym.id
        print(f"  [+] Gym Admin created gym-custom movement: '{metro_custom_ex['name']}'")

        # STEP 3: Coach adds tutorial video to gym-custom exercise & creates workout plan for client
        print("\n=== STEP 3: Coach Adds Video & Builds Workout for Client ===")
        res_vid = client.post(
            f"/api/v1/exercises/{metro_custom_ex['id']}/videos",
            json={
                "title": "SSB Lunge: Grip and Stance Setup",
                "video_url": "https://vimeo.com/987654321",
                "duration_seconds": 195,
                "is_primary": True,
            },
            headers=auth_header(metro_coach.id),
        )
        assert res_vid.status_code == 201
        print(f"  [+] Coach added technique video to gym movement (ID: {res_vid.json()['id']})")

        # Coach creates training plan for client Dave
        res_plan = client.post(
            "/api/v1/training-plans/",
            json={
                "client_id": metro_client.id,
                "name": f"Metro Hypertrophy Phase 1 {prefix}",
                "description": "8-week progressive overload block",
                "status": "active",
            },
            headers=auth_header(metro_coach.id),
        )
        assert res_plan.status_code == 201, res_plan.text
        plan_id = res_plan.json()["id"]

        # Coach creates workout day
        res_day = client.post(
            f"/api/v1/training-plans/{plan_id}/days",
            json={
                "name": "Day 1: Heavy Push & Legs",
                "description": "Compound lifts focusing on pristine mechanics",
                "day_number": 1,
                "order_index": 1,
            },
            headers=auth_header(metro_coach.id),
        )
        assert res_day.status_code == 201
        day_id = res_day.json()["id"]

        # Coach adds Platform Bench Press
        res_ex1 = client.post(
            f"/api/v1/training-plans/days/{day_id}/exercises",
            json={
                "exercise_name": "Barbell Bench Press",
                "exercise_id": platform_ex["id"],
                "sets": 4,
                "repetitions": "6-8",
                "rest_seconds": 120,
                "notes": "Pause 1s on chest on last set",
                "order_index": 1,
            },
            headers=auth_header(metro_coach.id),
        )
        assert res_ex1.status_code == 201
        print("  [+] Added Platform Bench Press to workout day")

        # Coach adds Gym Custom SSB Lunge
        res_ex2 = client.post(
            f"/api/v1/training-plans/days/{day_id}/exercises",
            json={
                "exercise_name": "Metro SSB Lunge",
                "exercise_id": metro_custom_ex["id"],
                "sets": 3,
                "repetitions": "10 per leg",
                "rest_seconds": 90,
                "notes": "Keep upright torso",
                "order_index": 2,
            },
            headers=auth_header(metro_coach.id),
        )
        assert res_ex2.status_code == 201
        print("  [+] Added Metro Custom SSB Lunge to workout day")

        # STEP 4: Client logs in, views plan, and opens technique videos
        print("\n=== STEP 4: Client Inspects Workout & Videos ===")
        res_client_plan = client.get(f"/api/v1/training-plans/{plan_id}", headers=auth_header(metro_client.id))
        assert res_client_plan.status_code == 200
        plan_data = res_client_plan.json()
        workout_exercises = plan_data["workout_days"][0]["exercises"]
        assert len(workout_exercises) == 2
        assert workout_exercises[0]["exercise"]["id"] == platform_ex["id"]
        assert workout_exercises[1]["exercise"]["id"] == metro_custom_ex["id"]

        # Client queries details and video gallery for the custom SSB Lunge
        res_client_vids = client.get(
            f"/api/v1/exercises/{metro_custom_ex['id']}", headers=auth_header(metro_client.id)
        )
        assert res_client_vids.status_code == 200
        assert len(res_client_vids.json()["videos"]) == 1
        assert res_client_vids.json()["videos"][0]["video_url"] == "https://vimeo.com/987654321"
        print("  [+] Client verified technique video is directly accessible from workout movement")

        # STEP 5: Verify Isolation: Apex client cannot see Metro custom exercise
        print("\n=== STEP 5: Verify Tenant Isolation ===")
        res_iso = client.get(f"/api/v1/exercises/{metro_custom_ex['id']}", headers=auth_header(apex_client.id))
        assert res_iso.status_code == 403, res_iso.text
        print("  [+] Apex gym client strictly forbidden from reading Metro private exercise (403 Forbidden)")

        print("\n=======================================================")
        print(">>> ALL EXERCISE & VIDEO LIBRARY USER FLOWS PASSED! <<<")
        print("=======================================================")

    finally:
        try:
            # Cleanup
            db.query(WorkoutExercise).filter(
                WorkoutExercise.tenant_id.in_([metro_gym.id, apex_gym.id])
            ).delete(synchronize_session=False)
            db.query(WorkoutDay).filter(
                WorkoutDay.tenant_id.in_([metro_gym.id, apex_gym.id])
            ).delete(synchronize_session=False)
            db.query(TrainingPlan).filter(
                TrainingPlan.tenant_id.in_([metro_gym.id, apex_gym.id])
            ).delete(synchronize_session=False)
            db.query(CoachClientAssignment).filter(
                CoachClientAssignment.tenant_id.in_([metro_gym.id, apex_gym.id])
            ).delete(synchronize_session=False)
            db.query(ExerciseVideo).filter(
                ExerciseVideo.title.like(f"%{prefix}%")
                | ExerciseVideo.title.like("%Bench Press%")
                | ExerciseVideo.title.like("%SSB Lunge%")
            ).delete(synchronize_session=False)
            db.query(Exercise).filter(
                Exercise.name.like(f"%{prefix}%")
                | (Exercise.tenant_id.in_([metro_gym.id, apex_gym.id]))
            ).delete(synchronize_session=False)
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.slug.like(f"%{prefix}%")).delete(synchronize_session=False)
            db.commit()
            print("[*] Cleaned up flow test data successfully.")
        except Exception as e:
            print(f"[!] Cleanup warning: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    run_flow()
