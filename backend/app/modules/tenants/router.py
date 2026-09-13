from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.tenants.schemas import TenantCreate, TenantRead, TenantUpdate
from app.modules.tenants.service import tenant_service

router = APIRouter()


@router.post(
    "/",
    response_model=TenantRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Tenant",
    description="Create a new gym/tenant with a clean, unique URL slug. "
                "TODO: In future, this will be restricted to super_admin or authenticated gym onboarding flows."
)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db)
):
    return tenant_service.create(db, obj_in=tenant_in)


@router.get(
    "/",
    response_model=List[TenantRead],
    summary="List Tenants",
    description="List all registered gyms/tenants. "
                "TODO: In future, this will be restricted strictly to super_admin."
)
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return tenant_service.get_multi(db, skip=skip, limit=limit)


@router.get(
    "/{tenant_id}",
    response_model=TenantRead,
    summary="Get Tenant by ID",
    description="Fetch a single gym/tenant by its UUID. "
                "TODO: In future, access will be restricted to super_admin or members of this tenant."
)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db)
):
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
