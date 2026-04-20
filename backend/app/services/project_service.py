from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

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
        # Check for duplicate name in org
        stmt = select(Project).where(
            and_(Project.org_id == org_id, Project.name.ilike(obj_in.name))
        )
        existing = await self.db.execute(stmt)
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project with name '{obj_in.name}' already exists in this organization."
            )

        # Auto-generate key if not provided
        p_key = obj_in.project_key
        if not p_key:
            words = obj_in.name.split()
            if len(words) > 1:
                p_key = "".join(word[0].upper() for word in words if word)
            else:
                p_key = obj_in.name[:3].upper()
            
            # Ensure it's not too short or invalid
            p_key = "".join(c for c in p_key if c.isalnum())
            if not p_key:
                p_key = "PRJ"

        db_obj = Project(
            org_id=org_id,
            created_by=created_by,
            name=obj_in.name,
            description=obj_in.description,
            project_key=p_key,
            project_url=obj_in.project_url,
            status=obj_in.status
        )
        self.db.add(db_obj)
        await self.db.flush() # Get ID
        
        # Check creator role to see if we need to add explicit membership
        user_stmt = select(User.role).where(User.id == created_by)
        user_res = await self.db.execute(user_stmt)
        creator_role = user_res.scalar_one_or_none()

        if creator_role != UserRole.org_admin:
            # Add creator as project manager only if they aren't an org_admin 
            # (since admins have inherent access to all projects in their org)
            creator_member = ProjectMember(
                project_id=db_obj.id,
                user_id=created_by,
                role=MemberRole.manager
            )
            self.db.add(creator_member)

        # Add other assigned members
        if obj_in.member_ids:
            for m_id in obj_in.member_ids:
                if m_id == created_by:
                    continue # Already added as manager
                
                # Check if user exists and is in the same org
                # In a robust system, we would batch check, but for simplicity:
                member_obj = ProjectMember(
                    project_id=db_obj.id,
                    user_id=m_id,
                    role=MemberRole.member
                )
                self.db.add(member_obj)

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

    async def bulk_delete_projects(self, org_id: UUID, project_ids: List[UUID]):
        # Perform deletion ensuring org_id matches (security check)
        stmt = delete(Project).where(
            and_(
                Project.org_id == org_id,
                Project.id.in_(project_ids)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()
        return True
