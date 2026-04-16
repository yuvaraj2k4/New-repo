"""
DevPilot Seed Script
────────────────────
Creates the initial Demo Organization, Org Admin, and Regular User.
This script is idempotent — safe to run multiple times.

Usage (from d:\\AI_SDLC\\backend):
    python scripts/seed.py
"""

import asyncio
import sys
import os

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from passlib.context import CryptContext

from app.core.config import settings
from app.models.organization import Organization, OrgStatus
from app.models.user import User, UserRole

# ── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ── Seed definitions ─────────────────────────────────────────────────────────
SEED_ORG = {
    "name": "Demo Organization",
    "slug": "demo-org",
    "status": OrgStatus.active,
}

SEED_USERS = [
    {
        "email": "admin@demo.com",
        "password": "Admin@123",
        "full_name": "Demo Admin",
        "role": UserRole.org_admin,
    },
    {
        "email": "user@demo.com",
        "password": "User@123",
        "full_name": "Demo User",
        "role": UserRole.user,
    },
]


# ── Seed logic ────────────────────────────────────────────────────────────────
async def seed(session: AsyncSession) -> None:
    # 1. Organization
    result = await session.execute(select(Organization).where(Organization.slug == SEED_ORG["slug"]))
    org = result.scalar_one_or_none()
    if not org:
        org = Organization(**SEED_ORG)
        session.add(org)
        await session.flush()  # Get org.id without committing
        print(f"  ✅ Created organization: {org.name} (id={org.id})")
    else:
        print(f"  ⏭  Organization already exists: {org.name}")

    # 2. Users
    for user_data in SEED_USERS:
        result = await session.execute(
            select(User).where(User.email == user_data["email"], User.org_id == org.id)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            user = User(
                org_id=org.id,
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True,
            )
            session.add(user)
            print(f"  ✅ Created user: {user.email} ({user.role})")
        else:
            print(f"  ⏭  User already exists: {user_data['email']}")

    await session.commit()
    print("\n✅ Seed complete.")


async def main() -> None:
    print("DevPilot — Seeding database...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSession = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with AsyncSession() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
