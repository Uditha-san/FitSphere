import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.tenants.models import Tenant
    from app.modules.users.models import User


class CoachClientAssignment(Base, TimestampMixin):
    """Represents an active or historical assignment between a coach and a client within a gym tenant."""
    __tablename__ = "coach_client_assignments"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    coach_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    coach: Mapped["User"] = relationship("User", foreign_keys=[coach_id])
    client: Mapped["User"] = relationship("User", foreign_keys=[client_id])

    __table_args__ = (
        Index(
            "uq_active_coach_client_assignment",
            "coach_id",
            "client_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )
