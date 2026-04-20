import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import sys
import os

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.user import User

async def check_users():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSession = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with AsyncSession() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print("--- Database Users ---")
        for u in users:
            print(f"Email: {u.email}, Role: {u.role}, Active: {u.is_active}")
        if not users:
            print("No users found in database.")
        print("----------------------")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_users())
