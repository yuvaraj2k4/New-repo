from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.user import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.schemas.token import TokenPair

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(self, email: str, password: str) -> User:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def get_user_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == UUID(user_id))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    def create_token_pair(self, user_id: str) -> TokenPair:
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token
        )
