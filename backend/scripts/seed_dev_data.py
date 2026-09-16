"""FitSphere Development Database Seeder.

Populates predictable, clean development accounts and sample coach-client assignments.
Usage:
    PYTHONPATH=backend ./backend/.venv/bin/python backend/scripts/seed_dev_data.py
"""

import sys
import os

# Add backend directory to sys.path if not present
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.modules.tenants.models import Tenant
from app.modules.users.models import User, UserRole
from app.modules.assignments.models import CoachClientAssignment
from app.modules.exercises.models import Exercise, ExerciseVideo, Difficulty, ExerciseType
from app.modules.training_plans.models import (
    TrainingPlan,
    WorkoutDay,
    WorkoutExercise,
    PlanStatus,
)


def seed_database():
    db: Session = SessionLocal()
    try:
        print("🌱 Starting FitSphere development database seeding...")

        # 1. Seed or retrieve default Tenant (PowerFit Gym)
        tenant = db.query(Tenant).filter(Tenant.slug == "powerfit-gym").first()
        if not tenant:
            tenant = Tenant(
                name="PowerFit Gym",
                slug="powerfit-gym",
                is_active=True,
            )
            db.add(tenant)
            db.flush()
            print(f"  [+] Created Tenant: {tenant.name} ({tenant.id})")
        else:
            print(f"  [*] Using existing Tenant: {tenant.name} ({tenant.id})")

        # 2. Seed Users
        users_to_seed = [
            {
                "email": "superadmin@fitsphere.io",
                "password": "SuperAdmin123!",
                "full_name": "Alexander Pierce (Super Admin)",
                "role": UserRole.SUPER_ADMIN.value,
                "tenant_id": None,
            },
            {
                "email": "gymadmin@fitsphere.io",
                "password": "GymAdmin123!",
                "full_name": "Marcus Vance (Gym Admin)",
                "role": UserRole.GYM_ADMIN.value,
                "tenant_id": tenant.id,
            },
            {
                "email": "coach.mike@fitsphere.io",
                "password": "Coach123!",
                "full_name": "Mike Tyson (Head Coach)",
                "role": UserRole.COACH.value,
                "tenant_id": tenant.id,
            },
            {
                "email": "coach.sarah@fitsphere.io",
                "password": "Coach123!",
                "full_name": "Sarah Connor (Strength Coach)",
                "role": UserRole.COACH.value,
                "tenant_id": tenant.id,
            },
            {
                "email": "client.alex@fitsphere.io",
                "password": "Client123!",
                "full_name": "Alex Rivera (Athlete Client)",
                "role": UserRole.CLIENT.value,
                "tenant_id": tenant.id,
            },
            {
                "email": "client.emma@fitsphere.io",
                "password": "Client123!",
                "full_name": "Emma Watson (Fitness Client)",
                "role": UserRole.CLIENT.value,
                "tenant_id": tenant.id,
            },
        ]

        seeded_users = {}
        for u in users_to_seed:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    tenant_id=u["tenant_id"],
                    is_active=True,
                )
                db.add(new_user)
                db.flush()
                seeded_users[u["email"]] = new_user
                print(f"  [+] Created User: {u['email']} [{u['role']}]")
            else:
                existing.full_name = u["full_name"]
                existing.role = u["role"]
                existing.tenant_id = u["tenant_id"]
                existing.is_active = True
                existing.hashed_password = get_password_hash(u["password"])
                db.flush()
                seeded_users[u["email"]] = existing
                print(f"  [*] Updated User: {u['email']} [{u['role']}]")

        # 3. Seed Sample Coach-Client Assignment (Coach Mike -> Client Alex)
        coach_mike = seeded_users["coach.mike@fitsphere.io"]
        client_alex = seeded_users["client.alex@fitsphere.io"]

        existing_assignment = (
            db.query(CoachClientAssignment)
            .filter(
                CoachClientAssignment.coach_id == coach_mike.id,
                CoachClientAssignment.client_id == client_alex.id,
                CoachClientAssignment.is_active == True,
            )
            .first()
        )

        if not existing_assignment:
            assignment = CoachClientAssignment(
                tenant_id=tenant.id,
                coach_id=coach_mike.id,
                client_id=client_alex.id,
                is_active=True,
            )
            db.add(assignment)
            db.flush()
            print(f"  [+] Created Assignment: Coach Mike -> Client Alex ({assignment.id})")
        else:
            print(f"  [*] Existing active assignment verified: Coach Mike -> Client Alex")

        # 4. Seed Sample Training Plan (Coach Mike -> Client Alex)
        plan_name = "8-Week Hypertrophy & Power Split"
        existing_plan = (
            db.query(TrainingPlan)
            .filter(
                TrainingPlan.coach_id == coach_mike.id,
                TrainingPlan.client_id == client_alex.id,
                TrainingPlan.name == plan_name,
            )
            .first()
        )

        if not existing_plan:
            plan = TrainingPlan(
                tenant_id=tenant.id,
                coach_id=coach_mike.id,
                client_id=client_alex.id,
                name=plan_name,
                description="Periodized strength and hypertrophy training routine targeting upper body pushing power and back density.",
                status=PlanStatus.ACTIVE.value,
            )
            db.add(plan)
            db.flush()

            # Day 1: Push
            day1 = WorkoutDay(
                training_plan_id=plan.id,
                tenant_id=tenant.id,
                name="Day 1: Push - Chest & Shoulders",
                description="Focus on horizontal and vertical pressing power with progressive overload",
                day_number=1,
                order_index=0,
            )
            db.add(day1)
            db.flush()

            db.add_all([
                WorkoutExercise(
                    workout_day_id=day1.id,
                    tenant_id=tenant.id,
                    exercise_name="Barbell Bench Press",
                    description="Standard flat bench compound movement",
                    sets=4,
                    repetitions="8-10",
                    rest_seconds=90,
                    notes="Control 2-second eccentric phase",
                    order_index=0,
                ),
                WorkoutExercise(
                    workout_day_id=day1.id,
                    tenant_id=tenant.id,
                    exercise_name="Incline Dumbbell Press",
                    description="Targeting clavicular head of pectoralis major",
                    sets=3,
                    repetitions="10-12",
                    rest_seconds=60,
                    notes="30-degree incline, deep stretch",
                    order_index=1,
                ),
                WorkoutExercise(
                    workout_day_id=day1.id,
                    tenant_id=tenant.id,
                    exercise_name="Standing Cable Lateral Raises",
                    description="Isolating middle deltoids",
                    sets=4,
                    repetitions="12-15",
                    rest_seconds=45,
                    notes="Smooth motion without swinging",
                    order_index=2,
                ),
            ])

            # Day 2: Pull
            day2 = WorkoutDay(
                training_plan_id=plan.id,
                tenant_id=tenant.id,
                name="Day 2: Pull - Back & Biceps",
                description="Upper back thickness, lat width, and elbow flexor hypertrophy",
                day_number=2,
                order_index=1,
            )
            db.add(day2)
            db.flush()

            db.add_all([
                WorkoutExercise(
                    workout_day_id=day2.id,
                    tenant_id=tenant.id,
                    exercise_name="Conventional Deadlift",
                    description="Posterior chain strength and hip hinge",
                    sets=4,
                    repetitions="6",
                    rest_seconds=120,
                    notes="Keep lats engaged and bar tight to shins",
                    order_index=0,
                ),
                WorkoutExercise(
                    workout_day_id=day2.id,
                    tenant_id=tenant.id,
                    exercise_name="Wide-Grip Lat Pulldown",
                    description="Vertical pulling for latissimus dorsi",
                    sets=3,
                    repetitions="10",
                    rest_seconds=60,
                    notes="Drive elbows down toward hips",
                    order_index=1,
                ),
            ])
            print(f"  [+] Created Sample Plan: {plan.name} with 2 workout days and 5 exercises")
        else:
            print(f"  [*] Existing active plan verified: {existing_plan.name}")

        # 5. Seed Exercise & Video Library
        super_admin_user = seeded_users["superadmin@fitsphere.io"]
        gym_admin_user = seeded_users["gymadmin@fitsphere.io"]

        library_exercises_to_seed = [
            # Platform Exercises (tenant_id = None)
            {
                "name": "Barbell Bench Press",
                "description": "Foundational compound pressing movement developing chest, anterior deltoids, and triceps.",
                "instructions": "1. Lie flat on the bench with eyes under the barbell.\n2. Retract scapulae and plant feet firmly.\n3. Lower bar with control to lower chest/nipple line.\n4. Drive upward powerfully until arms lock out.",
                "muscle_group": "Chest",
                "secondary_muscle_group": "Triceps",
                "equipment": "Barbell",
                "difficulty": Difficulty.INTERMEDIATE.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "Barbell Bench Press Technique & Form Guide",
                        "description": "Comprehensive tutorial covering grip width, scapular retraction, and bar path.",
                        "video_url": "https://www.youtube.com/watch?v=vcBig73ojpE",
                        "thumbnail_url": "https://img.youtube.com/vi/vcBig73ojpE/hqdefault.jpg",
                        "duration_seconds": 320,
                        "is_primary": True,
                    }
                ],
            },
            {
                "name": "Barbell Back Squat",
                "description": "King of lower body compound exercises building quad, glute, and spinal erector strength.",
                "instructions": "1. Position bar on upper traps, brace core with Valsalva maneuver.\n2. Break at hips and knees simultaneously.\n3. Descend below parallel while maintaining neutral lumbar spine.\n4. Drive through mid-foot to return to start position.",
                "muscle_group": "Quads",
                "secondary_muscle_group": "Glutes",
                "equipment": "Barbell",
                "difficulty": Difficulty.INTERMEDIATE.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "How to Squat: Depth, Stance, and Bracing",
                        "description": "Essential cues for avoiding knee valgus and achieving full depth with safety.",
                        "video_url": "https://www.youtube.com/watch?v=bEv6CCg2BC8",
                        "thumbnail_url": "https://img.youtube.com/vi/bEv6CCg2BC8/hqdefault.jpg",
                        "duration_seconds": 295,
                        "is_primary": True,
                    }
                ],
            },
            {
                "name": "Conventional Deadlift",
                "description": "Heavy posterior chain compound builder focusing on hamstrings, glutes, lats, and erectors.",
                "instructions": "1. Stand with feet hip-width apart, shins 1 inch from bar.\n2. Hinge at hips, grip bar outside shins.\n3. Pull chest up, pack lats, and pull slack out of the bar.\n4. Drive floor away through heels and lock out hips.",
                "muscle_group": "Back",
                "secondary_muscle_group": "Hamstrings",
                "equipment": "Barbell",
                "difficulty": Difficulty.ADVANCED.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "Deadlift Setup & Execution Masterclass",
                        "description": "Eliminate lower back rounding and master the hip hinge mechanism.",
                        "video_url": "https://www.youtube.com/watch?v=op9kVnSso6Q",
                        "thumbnail_url": "https://img.youtube.com/vi/op9kVnSso6Q/hqdefault.jpg",
                        "duration_seconds": 360,
                        "is_primary": True,
                    }
                ],
            },
            {
                "name": "Overhead Barbell Press",
                "description": "Strict standing vertical pressing movement building boulder shoulders and core stability.",
                "instructions": "1. Grip bar at shoulder width, rest on anterior deltoids.\n2. Squeeze glutes and brace abs tightly.\n3. Press bar directly vertical, tucking chin to allow bar passage.\n4. Push head forward through 'the window' at full lockout.",
                "muscle_group": "Shoulders",
                "secondary_muscle_group": "Triceps",
                "equipment": "Barbell",
                "difficulty": Difficulty.INTERMEDIATE.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "Strict Overhead Press Checklist",
                        "description": "Vertical bar path and proper lockout cues for healthy shoulders.",
                        "video_url": "https://www.youtube.com/watch?v=2yjwXTZQDDI",
                        "thumbnail_url": "https://img.youtube.com/vi/2yjwXTZQDDI/hqdefault.jpg",
                        "duration_seconds": 240,
                        "is_primary": True,
                    }
                ],
            },
            {
                "name": "Wide-Grip Lat Pulldown",
                "description": "Primary upper body vertical pull targeting latissimus dorsi and teres major.",
                "instructions": "1. Sit upright with thighs snug under pads.\n2. Grasp wide bar outside shoulder width.\n3. Drive elbows down and back toward back pockets.\n4. Squeeze lats at bottom and control the return stretch.",
                "muscle_group": "Back",
                "secondary_muscle_group": "Biceps",
                "equipment": "Cable",
                "difficulty": Difficulty.BEGINNER.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "Lat Pulldown: Stop Doing It Wrong",
                        "description": "How to isolate the lats without swinging or using excessive momentum.",
                        "video_url": "https://www.youtube.com/watch?v=CAwf7n6Luuc",
                        "thumbnail_url": "https://img.youtube.com/vi/CAwf7n6Luuc/hqdefault.jpg",
                        "duration_seconds": 210,
                        "is_primary": True,
                    }
                ],
            },
            {
                "name": "Standing Cable Lateral Raises",
                "description": "Constant tension medial deltoid isolation for shoulder width and aesthetic cap.",
                "instructions": "1. Set cable to lowest setting, hold handle with opposite hand.\n2. Raise arm outward leading with elbow in scapular plane.\n3. Pause briefly at parallel and lower under 2-second control.",
                "muscle_group": "Shoulders",
                "equipment": "Cable",
                "difficulty": Difficulty.BEGINNER.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": None,
                "created_by": super_admin_user.id,
                "videos": [
                    {
                        "title": "Cable Lateral Raise for Capped Delts",
                        "description": "Optimizing angle of resistance and avoiding upper trap dominance.",
                        "video_url": "https://www.youtube.com/watch?v=PPrzBWZDOhA",
                        "thumbnail_url": "https://img.youtube.com/vi/PPrzBWZDOhA/hqdefault.jpg",
                        "duration_seconds": 180,
                        "is_primary": True,
                    }
                ],
            },
            # Gym-Specific Exercises (tenant_id = PowerFit Gym)
            {
                "name": "PowerFit Safety-Squat Bar Box Squat",
                "description": "Gym specialty exercise: SSB box squat teaching explosive hip extension while saving shoulders.",
                "instructions": "1. Set box at parallel. Unrack SSB holding front handles.\n2. Sit back onto box under complete control without rocking.\n3. Pause 1 count on box, then drive explosively through heels.",
                "muscle_group": "Quads",
                "secondary_muscle_group": "Glutes",
                "equipment": "Specialty Bar",
                "difficulty": Difficulty.ADVANCED.value,
                "exercise_type": ExerciseType.STRENGTH.value,
                "tenant_id": tenant.id,
                "created_by": gym_admin_user.id,
                "videos": [
                    {
                        "title": "PowerFit Technique: Safety Squat Bar Box Setup",
                        "description": "Exclusive PowerFit Gym guide for box height and posterior chain engagement.",
                        "video_url": "https://www.youtube.com/watch?v=FqB36QcT5fM",
                        "thumbnail_url": "https://img.youtube.com/vi/FqB36QcT5fM/hqdefault.jpg",
                        "duration_seconds": 245,
                        "is_primary": True,
                    }
                ],
            },
        ]

        seeded_exercises_by_name = {}
        for ex_data in library_exercises_to_seed:
            existing_ex = (
                db.query(Exercise)
                .filter(
                    Exercise.name == ex_data["name"],
                    Exercise.tenant_id == ex_data["tenant_id"],
                )
                .first()
            )
            if not existing_ex:
                videos_data = ex_data.pop("videos", [])
                new_ex = Exercise(**ex_data)
                db.add(new_ex)
                db.flush()
                for vid in videos_data:
                    new_vid = ExerciseVideo(exercise_id=new_ex.id, **vid)
                    db.add(new_vid)
                db.flush()
                seeded_exercises_by_name[new_ex.name] = new_ex
                scope = "Platform" if new_ex.tenant_id is None else f"Tenant ({tenant.name})"
                print(f"  [+] Created {scope} Exercise: {new_ex.name} with {len(videos_data)} video(s)")
            else:
                seeded_exercises_by_name[existing_ex.name] = existing_ex
                print(f"  [*] Existing exercise verified: {existing_ex.name}")

        # Link workout exercises in sample plan to library exercises where matching
        workout_exercises_to_link = db.query(WorkoutExercise).filter(WorkoutExercise.tenant_id == tenant.id).all()
        for wex in workout_exercises_to_link:
            if not wex.exercise_id and wex.exercise_name in seeded_exercises_by_name:
                wex.exercise_id = seeded_exercises_by_name[wex.exercise_name].id
                db.add(wex)
                print(f"  [+] Linked WorkoutExercise '{wex.exercise_name}' to Exercise ID {wex.exercise_id}")

        db.commit()
        print("\n✅ FitSphere Development Seeding Completed Successfully!")
        print("=" * 60)
        print("Role          Email                       Password")
        print("-" * 60)
        print("Super Admin   superadmin@fitsphere.io     SuperAdmin123!")
        print("Gym Admin     gymadmin@fitsphere.io       GymAdmin123!")
        print("Coach 1       coach.mike@fitsphere.io     Coach123!")
        print("Coach 2       coach.sarah@fitsphere.io    Coach123!")
        print("Client 1      client.alex@fitsphere.io    Client123!")
        print("Client 2      client.emma@fitsphere.io    Client123!")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed with error: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
