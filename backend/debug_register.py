import asyncio
import sys
import traceback
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv('.env')

async def test():
    try:
        from app.core.database import AsyncSessionLocal
        from app.crud.organization import create_organization
        from app.schemas.organization import OrganizationCreate

        print("Imports OK")

        async with AsyncSessionLocal() as db:
            print("DB session created")
            data = OrganizationCreate(
                name='Test Hospital',
                email='debugtest99@test.com',
                admin_password='testpass123',
                admin_name='Test Admin',
                phone='1234567890',
                address='123 Test Street',
                timezone='Asia/Kolkata'
            )
            print("Schema created OK")
            result = await create_organization(db, data)
            print('SUCCESS:', result)
    except Exception as e:
        print(f"\nERROR: {type(e).__name__}: {e}")
        traceback.print_exc()

asyncio.run(test())
