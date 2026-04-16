from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List

from app.models.project import ProjectStatus, MemberRole
from app.schemas.user import UserResponse

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.active

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None

class ProjectResponse(ProjectBase):
    id: UUID
    org_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectMemberResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    role: MemberRole
    joined_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
