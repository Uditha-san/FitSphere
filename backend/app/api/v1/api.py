from fastapi import APIRouter
from app.api.v1.endpoints import health
from app.modules.assignments.router import router as assignments_router
from app.modules.auth.router import router as auth_router
from app.modules.tenants.router import router as tenants_router
from app.modules.training_plans.router import router as training_plans_router
from app.modules.users.router import router as users_router


api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(tenants_router, prefix="/tenants", tags=["Tenants"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(assignments_router, prefix="/assignments", tags=["Assignments"])
api_router.include_router(training_plans_router, prefix="/training-plans", tags=["Training Plans"])


