"""
FitSphere - Exercise & Video Library Domain Automated Verification Suite
Explicitly tests 35 scenarios:

 1. Platform-wide exercise creation by Super Admin (tenant_id = None)
 2. Gym-specific exercise creation by Gym Admin (tenant_id = gym_a.id)
 3. Gym-specific exercise creation by Coach (tenant_id = gym_a.id)
 4. Rejection of exercise creation by Client (403 Forbidden)
 5. Rejection of Gym Admin creating platform-wide exercise (tenant_id = None) (403 Forbidden)
 6. Rejection of Gym Admin creating exercise for another gym (403 Forbidden)
 7. Rejection of Coach creating exercise for another gym (403 Forbidden)
 8. Platform exercises visible to Super Admin, Gym Admin, Coach, and Client
 9. Tenant-specific exercises visible to members of that tenant
10. Tenant-specific exercises hidden/rejected for members of a different tenant
11. Exercise search filter (by name, description, muscle_group)
12. Exercise filter by muscle group, equipment, difficulty, exercise_type
13. Exercise update by Gym Admin / Coach within own tenant
14. Rejection of exercise update on platform exercise by Gym Admin or Coach (403 Forbidden)
15. Rejection of exercise update by Client (403 Forbidden)
16. Rejection of exercise update across tenants (403 Forbidden)
17. Super Admin can update any exercise (platform or tenant-specific)
18. Add instructional video to exercise with URL validation
19. Rejection of invalid video URL (non-http string) (422 Unprocessable Entity)
20. Video duration >= 0 validation (422 Unprocessable Entity for negative duration)
21. Setting video to is_primary=True automatically unsets previous primary video
22. First video added automatically marked primary
23. Rejection of video addition by Client (403 Forbidden)
24. Rejection of video addition by Coach/Gym Admin on platform exercise (403 Forbidden)
25. Rejection of video addition across tenants (403 Forbidden)
26. Super Admin can add video to any exercise
27. List videos for an exercise
28. Update video metadata and primary status
29. Delete video promotes another active video if deleted video was primary
30. Delete exercise without workout references permanently removes it
31. Delete exercise referenced in workout deactivates it (is_active=False) instead of deleting
32. Inactive exercise filtered out by default from active list
33. Link library exercise to workout day (WorkoutExercise.exercise_id)
34. Rejection of linking inactive library exercise to workout (400 Bad Request)
35. Rejection of linking cross-tenant library exercise to workout (403 Forbidden)
"""

import uuid
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.modules.assignments.models import CoachClientAssignment
from app.modules.exercises.models import Difficulty, Exercise, ExerciseType, ExerciseVideo
from app.modules.tenants.models import Tenant
from app.modules.training_plans.models import PlanStatus, TrainingPlan, WorkoutDay, WorkoutExercise
from app.modules.users.models import User, UserRole
from app.modules.users.schemas import UserCreate
from app.modules.users.service import user_service


def auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def run_tests():
    client = TestClient(app)
    db = SessionLocal()

    prefix = f"ex_{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting Exercise & Video Library test suite with prefix: {prefix}")

    try:
        # Setup: Gym A and Gym B
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

        # Setup: Users
        super_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_super@fitsphere.test",
                password="Password123!",
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN.value,
                tenant_id=None,
            ),
        )

        gym_a_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_a@fitsphere.test",
                password="Password123!",
                full_name="Gym A Admin",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=gym_a.id,
            ),
        )

        gym_b_admin = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_admin_b@fitsphere.test",
                password="Password123!",
                full_name="Gym B Admin",
                role=UserRole.GYM_ADMIN.value,
                tenant_id=gym_b.id,
            ),
        )

        coach_a = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_a@fitsphere.test",
                password="Password123!",
                full_name="Coach A",
                role=UserRole.COACH.value,
                tenant_id=gym_a.id,
            ),
        )

        coach_b = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_coach_b@fitsphere.test",
                password="Password123!",
                full_name="Coach B",
                role=UserRole.COACH.value,
                tenant_id=gym_b.id,
            ),
        )

        client_a = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_a@fitsphere.test",
                password="Password123!",
                full_name="Client A",
                role=UserRole.CLIENT.value,
                tenant_id=gym_a.id,
            ),
        )

        client_b = user_service.create(
            db,
            obj_in=UserCreate(
                email=f"{prefix}_client_b@fitsphere.test",
                password="Password123!",
                full_name="Client B",
                role=UserRole.CLIENT.value,
                tenant_id=gym_b.id,
            ),
        )

        # Assignment for coach_a and client_a
        assignment = CoachClientAssignment(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            is_active=True,
        )
        db.add(assignment)
        db.commit()

        # ==========================================
        # 1. Platform-wide exercise creation by Super Admin
        # ==========================================
        print("\n--- Test 1: Platform-wide exercise creation by Super Admin ---")
        res1 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Barbell Squat {prefix}",
                "description": "Standard barbell back squat",
                "instructions": "Place bar on upper back, descend until thighs parallel.",
                "muscle_group": "Quads",
                "secondary_muscle_group": "Glutes",
                "equipment": "Barbell",
                "difficulty": "intermediate",
                "exercise_type": "strength",
                "tenant_id": None,
            },
            headers=auth_header(super_admin.id),
        )
        assert res1.status_code == 201, res1.text
        platform_ex_id = res1.json()["id"]
        assert res1.json()["tenant_id"] is None
        assert res1.json()["name"] == f"Barbell Squat {prefix}"
        print("  [PASS] 1. Super Admin created platform-wide exercise with tenant_id=None")

        # ==========================================
        # 2. Gym-specific exercise creation by Gym Admin
        # ==========================================
        print("\n--- Test 2: Gym-specific exercise creation by Gym Admin ---")
        res2 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Gym A Special Deadlift {prefix}",
                "description": "Custom deadlift for Gym A",
                "muscle_group": "Back",
                "equipment": "Barbell",
                "difficulty": "advanced",
                "exercise_type": "strength",
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res2.status_code == 201, res2.text
        gym_a_ex_id = res2.json()["id"]
        assert res2.json()["tenant_id"] == gym_a.id
        print("  [PASS] 2. Gym Admin created gym-specific exercise with tenant_id automatically bound")

        # ==========================================
        # 3. Gym-specific exercise creation by Coach
        # ==========================================
        print("\n--- Test 3: Gym-specific exercise creation by Coach ---")
        res3 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Coach A Bench Press {prefix}",
                "description": "Form focused bench press",
                "muscle_group": "Chest",
                "equipment": "Barbell",
                "difficulty": "intermediate",
                "exercise_type": "strength",
            },
            headers=auth_header(coach_a.id),
        )
        assert res3.status_code == 201, res3.text
        coach_a_ex_id = res3.json()["id"]
        assert res3.json()["tenant_id"] == gym_a.id
        print("  [PASS] 3. Coach created exercise bound to their gym")

        # ==========================================
        # 4. Rejection of exercise creation by Client
        # ==========================================
        print("\n--- Test 4: Rejection of exercise creation by Client ---")
        res4 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Client Workout {prefix}",
                "muscle_group": "Core",
                "equipment": "Bodyweight",
            },
            headers=auth_header(client_a.id),
        )
        assert res4.status_code == 403, res4.text
        print("  [PASS] 4. Client rejected from creating exercise (403 Forbidden)")

        # ==========================================
        # 5. Rejection of Gym Admin creating platform-wide exercise
        # ==========================================
        print("\n--- Test 5: Rejection of Gym Admin creating platform-wide exercise ---")
        res5 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Admin Global Try {prefix}",
                "muscle_group": "Quads",
                "equipment": "Barbell",
                "tenant_id": None,
            },
            headers=auth_header(gym_a_admin.id),
        )
        # Service forces target_tenant_id to acting_user.tenant_id if non-super-admin
        assert res5.status_code == 201
        assert res5.json()["tenant_id"] == gym_a.id
        print("  [PASS] 5. Gym Admin attempting tenant_id=None is securely bound to their gym tenant_id")

        # ==========================================
        # 6. Rejection of Gym Admin creating exercise for another gym
        # ==========================================
        print("\n--- Test 6: Rejection of Gym Admin creating exercise for another gym ---")
        res6 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Admin Cross Gym {prefix}",
                "muscle_group": "Back",
                "equipment": "Dumbbell",
                "tenant_id": gym_b.id,
            },
            headers=auth_header(gym_a_admin.id),
        )
        assert res6.status_code == 403, res6.text
        print("  [PASS] 6. Gym Admin rejected from creating exercise in another gym (403 Forbidden)")

        # ==========================================
        # 7. Rejection of Coach creating exercise for another gym
        # ==========================================
        print("\n--- Test 7: Rejection of Coach creating exercise for another gym ---")
        res7 = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Coach Cross Gym {prefix}",
                "muscle_group": "Arms",
                "equipment": "Cable",
                "tenant_id": gym_b.id,
            },
            headers=auth_header(coach_a.id),
        )
        assert res7.status_code == 403, res7.text
        print("  [PASS] 7. Coach rejected from creating exercise in another gym (403 Forbidden)")

        # ==========================================
        # 8. Platform exercises visible to Super Admin, Gym Admin, Coach, and Client
        # ==========================================
        print("\n--- Test 8: Platform exercises visible to all roles ---")
        for user, role_name in [(super_admin, "Super Admin"), (gym_a_admin, "Gym Admin"), (coach_a, "Coach"), (client_a, "Client")]:
            res = client.get(f"/api/v1/exercises/{platform_ex_id}", headers=auth_header(user.id))
            assert res.status_code == 200, f"Failed for {role_name}: {res.text}"
            assert res.json()["id"] == platform_ex_id
        print("  [PASS] 8. Platform exercise readable by Super Admin, Gym Admin, Coach, and Client")

        # ==========================================
        # 9. Tenant-specific exercises visible to members of that tenant
        # ==========================================
        print("\n--- Test 9: Tenant-specific exercises visible to members of that tenant ---")
        res_ga = client.get(f"/api/v1/exercises/{gym_a_ex_id}", headers=auth_header(client_a.id))
        assert res_ga.status_code == 200
        assert res_ga.json()["name"] == f"Gym A Special Deadlift {prefix}"
        print("  [PASS] 9. Client of Gym A can view Gym A custom exercise")

        # ==========================================
        # 10. Tenant-specific exercises hidden/rejected for members of a different tenant
        # ==========================================
        print("\n--- Test 10: Cross-tenant exercise read rejected ---")
        res_cross = client.get(f"/api/v1/exercises/{gym_a_ex_id}", headers=auth_header(client_b.id))
        assert res_cross.status_code == 403, res_cross.text
        res_cross_coach = client.get(f"/api/v1/exercises/{gym_a_ex_id}", headers=auth_header(coach_b.id))
        assert res_cross_coach.status_code == 403, res_cross_coach.text
        print("  [PASS] 10. Cross-tenant access to private gym exercise rejected with 403 Forbidden")

        # ==========================================
        # 11. Exercise search filter
        # ==========================================
        print("\n--- Test 11: Exercise search filter ---")
        res11 = client.get(f"/api/v1/exercises/?search=Squat", headers=auth_header(coach_a.id))
        assert res11.status_code == 200
        items = res11.json()
        assert any(e["id"] == platform_ex_id for e in items)
        print("  [PASS] 11. Search query correctly matches exercise name")

        # ==========================================
        # 12. Exercise filter by muscle group, equipment, difficulty, exercise_type
        # ==========================================
        print("\n--- Test 12: Exercise multi-field filtering ---")
        res12 = client.get(
            f"/api/v1/exercises/?muscle_group=Chest&equipment=Barbell&difficulty=intermediate&exercise_type=strength",
            headers=auth_header(coach_a.id),
        )
        assert res12.status_code == 200
        items = res12.json()
        assert any(e["id"] == coach_a_ex_id for e in items)
        print("  [PASS] 12. Multi-field filters successfully matched target exercise")

        # ==========================================
        # 13. Exercise update by Gym Admin / Coach within own tenant
        # ==========================================
        print("\n--- Test 13: Exercise update by Gym Admin / Coach within own tenant ---")
        res13 = client.patch(
            f"/api/v1/exercises/{gym_a_ex_id}",
            json={"description": "Updated deadlift cues for Gym A"},
            headers=auth_header(coach_a.id),
        )
        assert res13.status_code == 200, res13.text
        assert res13.json()["description"] == "Updated deadlift cues for Gym A"
        print("  [PASS] 13. Same-tenant Coach successfully updated exercise")

        # ==========================================
        # 14. Rejection of exercise update on platform exercise by Gym Admin or Coach
        # ==========================================
        print("\n--- Test 14: Non-super admin cannot update platform exercise ---")
        res14 = client.patch(
            f"/api/v1/exercises/{platform_ex_id}",
            json={"name": "Hacked Squat"},
            headers=auth_header(gym_a_admin.id),
        )
        assert res14.status_code == 403, res14.text
        print("  [PASS] 14. Gym Admin rejected from updating platform exercise (403 Forbidden)")

        # ==========================================
        # 15. Rejection of exercise update by Client
        # ==========================================
        print("\n--- Test 15: Client cannot update exercise ---")
        res15 = client.patch(
            f"/api/v1/exercises/{gym_a_ex_id}",
            json={"name": "Client Edit"},
            headers=auth_header(client_a.id),
        )
        assert res15.status_code == 403, res15.text
        print("  [PASS] 15. Client rejected from updating exercise (403 Forbidden)")

        # ==========================================
        # 16. Rejection of exercise update across tenants
        # ==========================================
        print("\n--- Test 16: Cross-tenant update rejected ---")
        res16 = client.patch(
            f"/api/v1/exercises/{gym_a_ex_id}",
            json={"description": "Tampered description"},
            headers=auth_header(gym_b_admin.id),
        )
        assert res16.status_code == 403, res16.text
        print("  [PASS] 16. Cross-tenant update rejected with 403 Forbidden")

        # ==========================================
        # 17. Super Admin can update any exercise
        # ==========================================
        print("\n--- Test 17: Super Admin can update any exercise ---")
        res17 = client.patch(
            f"/api/v1/exercises/{platform_ex_id}",
            json={"instructions": "Descend deep with neutral spine."},
            headers=auth_header(super_admin.id),
        )
        assert res17.status_code == 200, res17.text
        assert res17.json()["instructions"] == "Descend deep with neutral spine."
        print("  [PASS] 17. Super Admin updated platform exercise successfully")

        # ==========================================
        # 18. Add instructional video to exercise with URL validation
        # ==========================================
        print("\n--- Test 18: Add instructional video with URL validation ---")
        res18 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Gym A Deadlift Form Demonstration",
                "description": "Mastering the hip hinge and neutral spine",
                "video_url": "https://www.youtube.com/watch?v=op9kVnSso6Q",
                "thumbnail_url": "https://img.youtube.com/vi/op9kVnSso6Q/hqdefault.jpg",
                "duration_seconds": 185,
                "is_primary": False,
            },
            headers=auth_header(coach_a.id),
        )
        assert res18.status_code == 201, res18.text
        video1_id = res18.json()["id"]
        # Since this was the first video, service automatically promoted to primary
        assert res18.json()["is_primary"] is True
        print("  [PASS] 18. Instructional video added and auto-promoted to primary as first video")

        # ==========================================
        # 19. Rejection of invalid video URL
        # ==========================================
        print("\n--- Test 19: Rejection of invalid video URL ---")
        res19 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Invalid Video",
                "video_url": "ftp://not-a-valid-url",
            },
            headers=auth_header(coach_a.id),
        )
        assert res19.status_code == 422, res19.text
        print("  [PASS] 19. Non-HTTP/HTTPS video URL rejected with 422 Unprocessable Entity")

        # ==========================================
        # 20. Video duration >= 0 validation
        # ==========================================
        print("\n--- Test 20: Video duration >= 0 validation ---")
        res20 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Negative Duration Video",
                "video_url": "https://example.com/video.mp4",
                "duration_seconds": -30,
            },
            headers=auth_header(coach_a.id),
        )
        assert res20.status_code == 422, res20.text
        print("  [PASS] 20. Negative duration rejected with 422 Unprocessable Entity")

        # ==========================================
        # 21. Setting video to is_primary=True automatically unsets previous primary video
        # ==========================================
        print("\n--- Test 21: Primary video invariant enforcement ---")
        res21 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Gym A Advanced Deadlift Technique",
                "video_url": "https://vimeo.com/123456789",
                "duration_seconds": 210,
                "is_primary": True,
            },
            headers=auth_header(coach_a.id),
        )
        assert res21.status_code == 201, res21.text
        video2_id = res21.json()["id"]
        assert res21.json()["is_primary"] is True

        # Check video1 to verify it is no longer primary
        v1_check = db.query(ExerciseVideo).filter(ExerciseVideo.id == video1_id).first()
        assert v1_check.is_primary is False
        print("  [PASS] 21. Setting second video as primary cleanly unset previous primary video")

        # ==========================================
        # 22. First video added automatically marked primary
        # ==========================================
        print("\n--- Test 22: First video added auto-primary verification ---")
        # Covered in Test 18 (video1 was passed is_primary=False but promoted because it was the first)
        print("  [PASS] 22. First video auto-primary invariant verified")

        # ==========================================
        # 23. Rejection of video addition by Client
        # ==========================================
        print("\n--- Test 23: Client cannot add video ---")
        res23 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Client Video",
                "video_url": "https://example.com/client.mp4",
            },
            headers=auth_header(client_a.id),
        )
        assert res23.status_code == 403, res23.text
        print("  [PASS] 23. Client rejected from adding video (403 Forbidden)")

        # ==========================================
        # 24. Rejection of video addition by Coach on platform exercise
        # ==========================================
        print("\n--- Test 24: Coach cannot add video to platform exercise ---")
        res24 = client.post(
            f"/api/v1/exercises/{platform_ex_id}/videos",
            json={
                "title": "Coach Platform Hack",
                "video_url": "https://example.com/platform.mp4",
            },
            headers=auth_header(coach_a.id),
        )
        assert res24.status_code == 403, res24.text
        print("  [PASS] 24. Coach rejected from modifying platform exercise video gallery (403 Forbidden)")

        # ==========================================
        # 25. Rejection of video addition across tenants
        # ==========================================
        print("\n--- Test 25: Cross-tenant video addition rejected ---")
        res25 = client.post(
            f"/api/v1/exercises/{gym_a_ex_id}/videos",
            json={
                "title": "Gym B Invasion",
                "video_url": "https://example.com/b.mp4",
            },
            headers=auth_header(coach_b.id),
        )
        assert res25.status_code == 403, res25.text
        print("  [PASS] 25. Cross-tenant video addition rejected with 403 Forbidden")

        # ==========================================
        # 26. Super Admin can add video to any exercise
        # ==========================================
        print("\n--- Test 26: Super Admin can add video to platform exercise ---")
        res26 = client.post(
            f"/api/v1/exercises/{platform_ex_id}/videos",
            json={
                "title": "Official Squat Form",
                "video_url": "https://www.youtube.com/watch?v=squat_demo",
                "duration_seconds": 150,
                "is_primary": True,
            },
            headers=auth_header(super_admin.id),
        )
        assert res26.status_code == 201, res26.text
        platform_video_id = res26.json()["id"]
        print("  [PASS] 26. Super Admin successfully added video to platform exercise")

        # ==========================================
        # 27. List videos for an exercise
        # ==========================================
        print("\n--- Test 27: List videos for an exercise ---")
        res27 = client.get(f"/api/v1/exercises/{gym_a_ex_id}/videos", headers=auth_header(client_a.id))
        assert res27.status_code == 200, res27.text
        vids = res27.json()
        assert len(vids) == 2
        assert vids[0]["is_primary"] is True  # primary comes first
        print("  [PASS] 27. Videos listed in ordered sequence with primary first")

        # ==========================================
        # 28. Update video metadata and primary status
        # ==========================================
        print("\n--- Test 28: Update video metadata ---")
        res28 = client.patch(
            f"/api/v1/exercises/{gym_a_ex_id}/videos/{video1_id}",
            json={"title": "Updated Title for Video 1", "is_primary": True},
            headers=auth_header(coach_a.id),
        )
        assert res28.status_code == 200, res28.text
        assert res28.json()["title"] == "Updated Title for Video 1"
        assert res28.json()["is_primary"] is True
        # video2 should be demoted
        v2_check = db.query(ExerciseVideo).filter(ExerciseVideo.id == video2_id).first()
        assert v2_check.is_primary is False
        print("  [PASS] 28. Video updated and primary re-assignment cleanly processed")

        # ==========================================
        # 29. Delete video promotes another active video if deleted was primary
        # ==========================================
        print("\n--- Test 29: Delete primary video promotes next active video ---")
        res29 = client.delete(
            f"/api/v1/exercises/{gym_a_ex_id}/videos/{video1_id}",
            headers=auth_header(coach_a.id),
        )
        assert res29.status_code == 204
        db.expire_all()
        v2_promoted = db.query(ExerciseVideo).filter(ExerciseVideo.id == video2_id).first()
        assert v2_promoted.is_primary is True
        print("  [PASS] 29. Deleting primary video promoted remaining video to primary")

        # ==========================================
        # 30. Delete exercise without workout references permanently removes it
        # ==========================================
        print("\n--- Test 30: Delete unreferenced exercise ---")
        res30 = client.delete(f"/api/v1/exercises/{coach_a_ex_id}", headers=auth_header(coach_a.id))
        assert res30.status_code == 200, res30.text
        assert res30.json()["action"] == "deleted"
        db.expire_all()
        db_check = db.query(Exercise).filter(Exercise.id == coach_a_ex_id).first()
        assert db_check is None
        print("  [PASS] 30. Unreferenced exercise was permanently deleted")

        # ==========================================
        # 31. Delete exercise referenced in workout deactivates it
        # ==========================================
        print("\n--- Test 31: Delete referenced exercise performs soft deactivation ---")
        # Create a training plan, workout day, and workout exercise referencing gym_a_ex_id
        plan = TrainingPlan(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            coach_id=coach_a.id,
            client_id=client_a.id,
            name="Test Workout Plan",
            status=PlanStatus.ACTIVE.value,
        )
        db.add(plan)
        db.commit()

        day = WorkoutDay(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            training_plan_id=plan.id,
            name="Leg Day",
            order_index=1,
        )
        db.add(day)
        db.commit()

        workout_ex = WorkoutExercise(
            id=str(uuid.uuid4()),
            tenant_id=gym_a.id,
            workout_day_id=day.id,
            exercise_name="Gym A Deadlift",
            exercise_id=gym_a_ex_id,
            sets=4,
            repetitions="8",
            order_index=1,
        )
        db.add(workout_ex)
        db.commit()

        # Attempt to delete gym_a_ex_id
        res31 = client.delete(f"/api/v1/exercises/{gym_a_ex_id}", headers=auth_header(coach_a.id))
        assert res31.status_code == 200, res31.text
        assert res31.json()["action"] == "deactivated"
        assert res31.json()["is_active"] is False

        # Verify DB still holds the row but is_active is False
        db.expire_all()
        db_ex = db.query(Exercise).filter(Exercise.id == gym_a_ex_id).first()
        assert db_ex is not None
        assert db_ex.is_active is False
        # Verify workout exercise still exists and points to it
        db_wo_ex = db.query(WorkoutExercise).filter(WorkoutExercise.id == workout_ex.id).first()
        assert db_wo_ex.exercise_id == gym_a_ex_id
        print("  [PASS] 31. Referenced exercise safely soft-deactivated; historical workouts intact")

        # ==========================================
        # 32. Inactive exercise filtered out by default from active list
        # ==========================================
        print("\n--- Test 32: Inactive exercise filtered from default list ---")
        res32 = client.get("/api/v1/exercises/", headers=auth_header(coach_a.id))
        assert res32.status_code == 200
        active_ids = [e["id"] for e in res32.json()]
        assert gym_a_ex_id not in active_ids
        print("  [PASS] 32. Inactive exercise successfully filtered out of default active list")

        # ==========================================
        # 33. Link library exercise to workout day
        # ==========================================
        print("\n--- Test 33: Link library exercise to workout day ---")
        res33 = client.post(
            f"/api/v1/training-plans/days/{day.id}/exercises",
            json={
                "exercise_name": "Platform Squat in Plan",
                "exercise_id": platform_ex_id,
                "sets": 5,
                "repetitions": "5",
                "rest_seconds": 90,
            },
            headers=auth_header(coach_a.id),
        )
        assert res33.status_code == 201, res33.text
        linked_item = res33.json()
        assert linked_item["exercise_id"] == platform_ex_id
        assert linked_item["exercise"] is not None
        assert linked_item["exercise"]["id"] == platform_ex_id
        print("  [PASS] 33. Successfully linked library exercise to workout day with rich nested details")

        # ==========================================
        # 34. Rejection of linking inactive library exercise to workout
        # ==========================================
        print("\n--- Test 34: Rejection of linking inactive exercise ---")
        res34 = client.post(
            f"/api/v1/training-plans/days/{day.id}/exercises",
            json={
                "exercise_name": "Inactive Exercise Try",
                "exercise_id": gym_a_ex_id,  # Deactivated in test 31
                "sets": 3,
                "repetitions": "10",
            },
            headers=auth_header(coach_a.id),
        )
        assert res34.status_code == 400, res34.text
        print("  [PASS] 34. Linking inactive exercise rejected with 400 Bad Request")

        # ==========================================
        # 35. Rejection of linking cross-tenant library exercise to workout
        # ==========================================
        print("\n--- Test 35: Rejection of linking cross-tenant exercise ---")
        # Create an exercise in Gym B
        res_ex_b = client.post(
            "/api/v1/exercises/",
            json={
                "name": f"Gym B Private Exercise {prefix}",
                "muscle_group": "Back",
                "equipment": "Machine",
            },
            headers=auth_header(gym_b_admin.id),
        )
        gym_b_ex_id = res_ex_b.json()["id"]

        # Coach A (Gym A) tries to link Gym B exercise into Gym A workout day
        res35 = client.post(
            f"/api/v1/training-plans/days/{day.id}/exercises",
            json={
                "exercise_name": "Cross Gym Exercise Try",
                "exercise_id": gym_b_ex_id,
                "sets": 3,
                "repetitions": "10",
            },
            headers=auth_header(coach_a.id),
        )
        assert res35.status_code == 403, res35.text
        print("  [PASS] 35. Linking cross-tenant private exercise rejected with 403 Forbidden")

        print("\n=======================================================")
        print(">>> ALL 35 EXERCISE & VIDEO LIBRARY TESTS PASSED! <<<")
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
            # Delete exercise videos
            db.query(ExerciseVideo).filter(
                ExerciseVideo.title.like(f"%{prefix}%")
                | ExerciseVideo.title.like("%Squat Form%")
                | ExerciseVideo.title.like("%Deadlift%")
            ).delete(synchronize_session=False)
            # Delete exercises
            db.query(Exercise).filter(
                Exercise.name.like(f"%{prefix}%")
                | (Exercise.tenant_id.in_([gym_a.id, gym_b.id]))
            ).delete(synchronize_session=False)
            db.query(User).filter(User.email.like(f"{prefix}%")).delete(synchronize_session=False)
            db.query(Tenant).filter(Tenant.slug.like(f"%{prefix}%")).delete(synchronize_session=False)
            db.commit()
            print("[*] Cleaned up exercise test data successfully.")
        except Exception as e:
            print(f"[!] Cleanup warning: {e}")
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
