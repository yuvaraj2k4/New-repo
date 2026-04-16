from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from uuid import UUID

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_org(self, org_id: UUID):
        stmt = select(User).where(User.org_id == org_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_user(self, org_id: UUID, obj_in: UserCreate) -> User:
        # Check if email exists
        existing = await self.get_by_email(obj_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
            
        hashed_password = get_password_hash(obj_in.password)
        db_obj = User(
            org_id=org_id,
            email=obj_in.email,
            hashed_password=hashed_password,
            full_name=obj_in.full_name,
            role=obj_in.role
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update_user(self, user_id: UUID, obj_in: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
            
        await self.db.commit()
        await self.db.refresh(user)
        return user
