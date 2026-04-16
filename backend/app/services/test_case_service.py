from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID

from app.models.test_case import TestCase
from app.schemas.test_case import TestCaseCreate

class TestCaseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_project_test_cases(self, project_id: UUID, org_id: UUID):
        stmt = select(TestCase).where(
            and_(TestCase.project_id == project_id, TestCase.org_id == org_id)
        ).order_by(TestCase.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_test_case(self, org_id: UUID, project_id: UUID, created_by: UUID, obj_in: TestCaseCreate) -> TestCase:
        db_obj = TestCase(
            org_id=org_id,
            project_id=project_id,
            created_by=created_by,
            document_id=obj_in.document_id,
            title=obj_in.title,
            source=obj_in.source,
            test_type=obj_in.test_type,
            content=obj_in.content,
            file_path=obj_in.file_path
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj
