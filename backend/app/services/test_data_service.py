from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID

from app.models.test_data import TestData
from app.schemas.test_data import TestDataCreate

class TestDataService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_project_test_data(self, project_id: UUID, org_id: UUID):
        stmt = select(TestData).where(
            and_(TestData.project_id == project_id, TestData.org_id == org_id)
        ).order_by(TestData.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_test_data(self, org_id: UUID, project_id: UUID, created_by: UUID, obj_in: TestDataCreate) -> TestData:
        db_obj = TestData(
            org_id=org_id,
            project_id=project_id,
            created_by=created_by,
            test_case_id=obj_in.test_case_id,
            content=obj_in.content,
            file_path=obj_in.file_path
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj
