from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.schemas.user import UserResponse, UserCreate
from app.core.dependencies import get_current_user, require_org_admin
from app.services.user_service import UserService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def read_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_org_admin)
):
    user_service = UserService(db)
    return await user_service.get_by_org(current_user.org_id)

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_org_admin)
):
    user_service = UserService(db)
    return await user_service.create_user(current_user.org_id, user_in)
