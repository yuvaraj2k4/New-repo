from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.schemas.project import ProjectResponse, ProjectCreate, ProjectMemberResponse
from app.core.dependencies import get_current_user, validate_csrf
from app.services.project_service import ProjectService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    return await project_service.get_user_projects(current_user)

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    project_service = ProjectService(db)
    return await project_service.create_project(current_user.org_id, current_user.id, project_in)

@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_service = ProjectService(db)
    project = await project_service.get_by_id(project_id, current_user.org_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
