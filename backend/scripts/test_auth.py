import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import sys
import os

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.user import User
from app.core.security import verify_password

async def test_auth():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSession = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with AsyncSession() as session:
        email = "admin@demo.com"
        password = "Admin@123"
        
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User {email} not found.")
            return

        is_valid = verify_password(password, user.hashed_password)
        print(f"Auth test for {email}: {'SUCCESS' if is_valid else 'FAILED'}")
        print(f"Stored hash: {user.hashed_password}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_auth())
