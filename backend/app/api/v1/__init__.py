from fastapi import APIRouter
from app.api.v1 import (
    auth, organizations, doctors, patients,
    appointments, ai_config, call_logs, dashboard, specialty, knowledge
)
from app.api.v1.super_admin import router as super_admin_router

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(organizations.router)
router.include_router(doctors.router)
router.include_router(doctors.shifts_router)
router.include_router(patients.router)
router.include_router(appointments.router)
router.include_router(specialty.router)
router.include_router(specialty.symptoms_router)
router.include_router(ai_config.router)
router.include_router(call_logs.router)
router.include_router(dashboard.router)
router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])

router.include_router(super_admin_router)
