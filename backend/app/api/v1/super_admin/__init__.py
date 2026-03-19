from fastapi import APIRouter
from app.api.v1.super_admin import auth, dashboard, tenants, team

router = APIRouter(prefix="/super-admin")
router.include_router(auth.router)
router.include_router(dashboard.router)
router.include_router(tenants.router)
router.include_router(team.router)
