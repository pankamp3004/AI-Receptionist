import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.organization import Organization, Admin
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.core.security import hash_password


async def create_organization(db: AsyncSession, data: OrganizationCreate) -> tuple[Organization, Admin]:
    org = Organization(
        name=data.name,
        type=data.type,
        phone=data.phone,
        email=data.email,
        address=data.address,
        timezone=data.timezone,
    )
    db.add(org)
    await db.flush()

    admin = Admin(
        organization_id=org.id,
        email=data.email,
        hashed_password=hash_password(data.admin_password),
        name=data.admin_name,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(org)
    await db.refresh(admin)
    return org, admin


async def get_organization(db: AsyncSession, org_id: uuid.UUID) -> Organization | None:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    return result.scalar_one_or_none()


async def update_organization(db: AsyncSession, org: Organization, data: OrganizationUpdate) -> Organization:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


async def get_admin_by_email(db: AsyncSession, email: str) -> Admin | None:
    result = await db.execute(select(Admin).where(Admin.email == email))
    return result.scalar_one_or_none()
