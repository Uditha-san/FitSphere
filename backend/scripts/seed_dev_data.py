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
