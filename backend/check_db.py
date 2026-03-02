import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv('.env')

async def check():
    url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
    pool = await asyncpg.create_pool(url)
    admins = await pool.fetch('SELECT email, organization_id FROM admins')
    sessions = await pool.fetch('SELECT session_id, organization_id FROM call_session')
    
    print('Admins:')
    for a in admins: print(dict(a))
    
    print('\nSessions:')
    for s in sessions: print(dict(s))
    await pool.close()

asyncio.run(check())
