import re
import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.services.base import BaseService
from app.modules.tenants.models import Tenant
from app.modules.tenants.repository import TenantRepository, tenant_repository
from app.modules.tenants.schemas import TenantCreate, TenantUpdate
from app.modules.users.models import User, UserRole


RESERVED_SLUGS = {
    "admin",
    "api",
    "auth",
    "login",
    "dashboard",
    "superadmin",
    "health",
    "system",
    "fitsphere",
    "app",
}


class TenantService(BaseService[Tenant, TenantRepository]):
    def __init__(self, repository: TenantRepository = tenant_repository):
        super().__init__(repository)

    def normalize_slug_text(self, text: str) -> str:
        """Convert string to normalized slug format."""
        # Lowercase and trim
        slug = text.strip().lower()
        # Strip apostrophes and quotes so e.g. "Gold's" becomes "golds"
        slug = re.sub(r"['\"]+", "", slug)
        # Replace remaining non-alphanumeric characters with hyphens
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        # Strip leading/trailing hyphens
        slug = slug.strip("-")
        # Enforce max practical length (truncate at 48 characters)
        if len(slug) > 48:
            slug = slug[:48].rstrip("-")
        return slug

    def generate_slug(self, db: Session, name: str, custom_slug: Optional[str] = None) -> str:
        """Generate a clean, unique, and safe URL slug for a tenant."""
        raw_slug = custom_slug if custom_slug and custom_slug.strip() else name
        base_slug = self.normalize_slug_text(raw_slug)

        # Handle empty or invalid slug resulting from purely special characters
        if not base_slug:
            base_slug = f"tenant-{uuid.uuid4().hex[:8]}"

        # Prevent collision with reserved platform slugs
        if base_slug in RESERVED_SLUGS:
            base_slug = f"{base_slug}-gym"

        candidate_slug = base_slug
        counter = 2

        # Check for uniqueness and append counter if duplicate
        while self.repository.get_by_slug(db, candidate_slug) is not None:
            candidate_slug = f"{base_slug}-{counter}"
            counter += 1

        return candidate_slug

    def create(
        self, db: Session, *, obj_in: TenantCreate, acting_user: Optional[User] = None
    ) -> Tenant:
        """Create a new Tenant with a validated, unique slug."""
        if acting_user and acting_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: only super_admin may create tenants",
            )

        slug = self.generate_slug(db, name=obj_in.name, custom_slug=obj_in.slug)
        create_data = obj_in.model_dump(exclude={"slug"})
        create_data["slug"] = slug

        return self.repository.create(db, obj_in=create_data)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Tenant]:
        """Retrieve tenant by URL slug."""
        normalized = self.normalize_slug_text(slug)
        return self.repository.get_by_slug(db, normalized)

    def update(
        self, db: Session, *, id: str, obj_in: TenantUpdate, acting_user: Optional[User] = None
    ) -> Optional[Tenant]:
        """Update a tenant. Slug is preserved unless explicitly provided."""
        if acting_user and acting_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: only super_admin may update tenant details",
            )

        tenant = self.get(db, id=id)

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )

        update_data = obj_in.model_dump(exclude_unset=True)

        # If slug is explicitly updated (administrative operation), validate uniqueness
        if "slug" in update_data and update_data["slug"]:
            new_slug = self.normalize_slug_text(update_data["slug"])
            if new_slug in RESERVED_SLUGS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slug '{new_slug}' is reserved by the platform"
                )
            existing = self.repository.get_by_slug(db, new_slug)
            if existing and existing.id != id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slug '{new_slug}' is already taken"
                )
            update_data["slug"] = new_slug

        return self.repository.update(db, db_obj=tenant, obj_in=update_data)


tenant_service = TenantService()
