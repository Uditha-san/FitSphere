from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.repositories.base import BaseRepository
from app.modules.tenants.models import Tenant
from app.modules.tenants.schemas import TenantCreate, TenantUpdate


class TenantRepository(BaseRepository[Tenant, TenantCreate, TenantUpdate]):
    def __init__(self):
        super().__init__(Tenant)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Tenant]:
        """Fetch a tenant by its unique URL slug."""
        stmt = select(self.model).where(self.model.slug == slug)
        return db.scalars(stmt).first()


tenant_repository = TenantRepository()
