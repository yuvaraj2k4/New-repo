from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID

from app.models.project import Project, ProjectMember, MemberRole
from app.models.user import User, UserRole
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, project_id: UUID, org_id: UUID) -> Project:
        stmt = select(Project).where(
            and_(Project.id == project_id, Project.org_id == org_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
        
    async def get_by_id_with_members(self, project_id: UUID, org_id: UUID) -> Project:
        stmt = select(Project).options(
            selectinload(Project.members).selectinload(ProjectMember.user)
        ).where(
            and_(Project.id == project_id, Project.org_id == org_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_projects(self, user: User):
        if user.role == UserRole.org_admin:
            # Admins see all projects in org
            stmt = select(Project).where(Project.org_id == user.org_id)
        else:
            # Users see projects they are members of
            stmt = select(Project).join(ProjectMember).where(
                and_(Project.org_id == user.org_id, ProjectMember.user_id == user.id)
            )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_project(self, org_id: UUID, created_by: UUID, obj_in: ProjectCreate) -> Project:
        db_obj = Project(
            org_id=org_id,
            created_by=created_by,
            name=obj_in.name,
            description=obj_in.description,
            status=obj_in.status
        )
        self.db.add(db_obj)
        await self.db.flush() # Get ID
        
        # Add creator as project manager
        member = ProjectMember(
            project_id=db_obj.id,
            user_id=created_by,
            role=MemberRole.manager
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def add_member(self, project_id: UUID, user_id: UUID, role: MemberRole = MemberRole.member):
        # Check if already a member
        stmt = select(ProjectMember).where(
            and_(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="User is already a member of this project")
            
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role
        )
        self.db.add(member)
        await self.db.commit()
        return member
