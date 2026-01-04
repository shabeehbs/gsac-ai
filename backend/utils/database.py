import asyncpg
import os
from typing import Optional

class Database:
    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def connect(cls):
        if cls._pool is None:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is not set")

            cls._pool = await asyncpg.create_pool(
                database_url,
                min_size=5,
                max_size=20,
                command_timeout=60
            )
        return cls._pool

    @classmethod
    async def disconnect(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    async def get_connection(cls):
        pool = await cls.connect()
        return await pool.acquire()

    @classmethod
    async def release_connection(cls, conn):
        pool = await cls.connect()
        await pool.release(conn)

    @classmethod
    async def fetch_one(cls, query: str, *args):
        pool = await cls.connect()
        async with pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    @classmethod
    async def fetch_all(cls, query: str, *args):
        pool = await cls.connect()
        async with pool.acquire() as conn:
            return await conn.fetch(query, *args)

    @classmethod
    async def execute(cls, query: str, *args):
        pool = await cls.connect()
        async with pool.acquire() as conn:
            return await conn.execute(query, *args)

    @classmethod
    async def execute_many(cls, query: str, args_list):
        pool = await cls.connect()
        async with pool.acquire() as conn:
            return await conn.executemany(query, args_list)
