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
