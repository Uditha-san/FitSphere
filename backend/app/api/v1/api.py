from fastapi import APIRouter
from app.api.v1.endpoints import health
from app.modules.tenants import router as tenants_router
from app.modules.users import router as users_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(tenants_router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
