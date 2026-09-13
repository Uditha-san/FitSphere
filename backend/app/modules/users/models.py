import uuid
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    GYM_ADMIN = "gym_admin"
    COACH = "coach"
    CLIENT = "client"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    tenant_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=True
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
        default=UserRole.CLIENT.value
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    tenant: Mapped[Optional["Tenant"]] = relationship(
        "Tenant",
        back_populates="users"
    )
