import asyncio
import os
import uuid
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.crud.call_log import list_call_logs
from app.schemas.call_log import CallSessionOut

load_dotenv(".env")

async def run():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    org_id = uuid.UUID("228608d0-5907-4381-bb2b-d834b1bc14e6")
    
    async with async_session() as session:
        logs = await list_call_logs(session, org_id)
        print(f"Found {len(logs)} logs using CRUD function.")
        for log in logs:
            try:
                out = CallSessionOut.model_validate(log)
                print("Serialized:", out.model_dump_json(indent=2))
            except Exception as e:
                print("Failed serialization:", e)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
