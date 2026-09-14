from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_super_admin
from app.db.session import get_db
from app.modules.tenants.schemas import TenantCreate, TenantRead, TenantUpdate
from app.modules.tenants.service import tenant_service
from app.modules.users.models import User, UserRole

router = APIRouter()


@router.post(
    "/",
    response_model=TenantRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Tenant",
    description="Create a new gym/tenant with a clean, unique URL slug. Restricted strictly to super_admin."
)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return tenant_service.create(db, obj_in=tenant_in, acting_user=current_user)



@router.get(
    "/",
    response_model=List[TenantRead],
    summary="List Tenants",
    description="List all registered gyms/tenants. Restricted strictly to super_admin."
)
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return tenant_service.get_multi(db, skip=skip, limit=limit)


@router.get(
    "/{tenant_id}",
    response_model=TenantRead,
    summary="Get Tenant by ID",
    description="Fetch a single gym/tenant by its UUID. super_admin may retrieve any tenant; tenant-scoped users may retrieve only their own."
)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != UserRole.SUPER_ADMIN.value:
        if current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access forbidden: you may only access your own gym tenant"
            )

    tenant = tenant_service.get(db, id=tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


@router.get(
    "/by-slug/{slug}",
    response_model=TenantRead,
    summary="Get Tenant by Slug",
    description="Public lookup to resolve a gym/tenant by its URL slug (e.g. for gym branding and login screens)."
)
def get_tenant_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    tenant = tenant_service.get_by_slug(db, slug=slug)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant
