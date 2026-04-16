from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID
import io
import openpyxl

from app.db.session import get_db
from app.schemas.test_case import TestCaseResponse, TestCaseCreate
from app.core.dependencies import get_current_user, require_project_member, validate_csrf
from app.services.test_case_service import TestCaseService
from app.services.document_service import DocumentService
from app.models.user import User

router = APIRouter()


@router.get("/project/{project_id}", response_model=List[TestCaseResponse])
async def read_project_test_cases(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
):
    test_case_service = TestCaseService(db)
    return await test_case_service.get_project_test_cases(project_id, current_user.org_id)


@router.post("/project/{project_id}", response_model=TestCaseResponse)
async def create_test_case(
    project_id: UUID,
    tc_in: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    test_case_service = TestCaseService(db)
    return await test_case_service.create_test_case(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=tc_in,
    )


@router.post("/project/{project_id}/generate/{document_id}")
async def generate_test_cases_from_brd(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Read the BRD text from document_id and dispatch the test case generation Celery task.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.content:
        raise HTTPException(status_code=400, detail="BRD Document has no content to generate tests from.")

    from app.workers.tasks import generate_test_cases_task

    # Fire and forget task
    task = generate_test_cases_task.delay(
        str(document_id),
        doc.content,
        str(project_id),
        str(current_user.org_id),
        str(current_user.id)
    )

    return {"message": "Test case generation started", "task_id": task.id, "document_id": str(document_id)}


@router.get("/project/{project_id}/export")
async def export_excel(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
):
    """
    Exports test cases across the project into an Excel sheet.
    """
    test_case_service = TestCaseService(db)
    test_cases = await test_case_service.get_project_test_cases(project_id, current_user.org_id)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Test Cases"
    
    # Headers
    headers = ["Test Case ID", "Module", "Description", "Pre-conditions", "Steps to Execute", "Expected Result", "Status"]
    ws.append(headers)
    
    # Content rows
    for tc in test_cases:
        content = tc.content if tc.content else {}
        ws.append([
            content.get("test_case_id", str(tc.id)),
            content.get("module", tc.title or ""),
            content.get("description", ""),
            content.get("pre_conditions", ""),
            content.get("steps_to_execute", ""),
            content.get("expected_result", ""),
            tc.source.value
        ])
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    headers_dict = {
        'Content-Disposition': f'attachment; filename="test_cases_{project_id}.xlsx"'
    }
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_dict
    )

