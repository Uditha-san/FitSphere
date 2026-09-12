from typing import Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


class TenantMixin:
    """Architectural preparation mixin for multi-tenancy.
    
    Provides a standard indexed tenant_id column on tenant-scoped database entities.
    Does NOT implement tenant management logic or business entities.
    """
    tenant_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        index=True,
        nullable=True
    )
