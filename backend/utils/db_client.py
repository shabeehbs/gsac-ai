import asyncpg
import os
from typing import Optional

_pool: Optional[asyncpg.Pool] = None

async def get_db_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL must be set")
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    return _pool

async def close_db_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
