from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.schemas.test_data import TestDataResponse, TestDataCreate
from app.core.dependencies import get_current_user, require_project_member, validate_csrf
from app.services.test_data_service import TestDataService
from app.services.test_case_service import TestCaseService
from app.models.user import User

router = APIRouter()


@router.get("/project/{project_id}", response_model=List[TestDataResponse])
async def read_project_test_data(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
):
    test_data_service = TestDataService(db)
    return await test_data_service.get_project_test_data(project_id, current_user.org_id)


@router.post("/project/{project_id}", response_model=TestDataResponse)
async def create_test_data(
    project_id: UUID,
    td_in: TestDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    test_data_service = TestDataService(db)
    return await test_data_service.create_test_data(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=td_in,
    )


@router.post("/project/{project_id}/generate/{test_case_id}")
async def generate_test_data_from_tc(
    project_id: UUID,
    test_case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    import json
    tc_service = TestCaseService(db)
    
    # Needs a way to get by id, but test_case_service only has get_project_test_cases right now.
    # We can fetch it via SQLAlchemy here for simplicity.
    from app.models.test_case import TestCase
    from sqlalchemy import select, and_
    
    stmt = select(TestCase).where(
        and_(
            TestCase.id == test_case_id,
            TestCase.project_id == project_id,
            TestCase.org_id == current_user.org_id
        )
    )
    result = await db.execute(stmt)
    tc = result.scalar_one_or_none()
    
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    tc_json = json.dumps(tc.content) if isinstance(tc.content, dict) or isinstance(tc.content, list) else str(tc.content)

    from app.workers.tasks import generate_test_data_task

    task = generate_test_data_task.delay(
        tc_json,
        str(project_id),
        str(current_user.org_id),
        str(current_user.id),
        str(test_case_id)
    )

    return {"message": "Test data generation started", "task_id": task.id, "test_case_id": str(test_case_id)}
