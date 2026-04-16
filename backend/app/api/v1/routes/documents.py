from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from pydantic import BaseModel

from app.db.session import get_db
from app.schemas.document import DocumentResponse, DocumentCreate
from app.core.dependencies import get_current_user, require_project_member, validate_csrf
from app.services.document_service import DocumentService
from app.models.user import User
from app.utils.file_parser import extract_text_from_upload

router = APIRouter()


# ── Request body schema for BRD generation ───────────────────────────────────
class BRDGenerateRequest(BaseModel):
    context_text: str


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=List[DocumentResponse])
async def read_project_documents(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),   # ← membership enforced
):
    document_service = DocumentService(db)
    return await document_service.get_project_documents(project_id, current_user.org_id)


@router.post("/project/{project_id}", response_model=DocumentResponse)
async def create_document(
    project_id: UUID,
    doc_in: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),   # ← membership enforced
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    document_service = DocumentService(db)
    return await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def read_document(
    document_id: UUID,
    project_id: UUID,   # query param — caller must supply the project
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
):
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# ── BRD generation (Celery) ───────────────────────────────────────────────────

@router.post("/{document_id}/generate/{project_id}")
async def trigger_brd_generation(
    document_id: UUID,
    project_id: UUID,
    body: BRDGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),   # ← membership enforced
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Validate the document exists and belongs to this org/project, then
    dispatch the BRD generation to a Celery worker.  Returns a task_id
    that the frontend can poll via GET /documents/task/{task_id}/status.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Import here to avoid circular-import at module level
    from app.workers.tasks import generate_brd_task

    task = generate_brd_task.delay(str(document_id), body.context_text)
    return {"message": "BRD generation started", "task_id": task.id, "document_id": str(document_id)}


# ── Generate BRD from uploaded file ───────────────────────────────────────────

@router.post("/project/{project_id}/generate-brd-from-file")
async def generate_brd_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a .txt or .docx file, extract its text, create a document record,
    and dispatch a Celery task to generate a BRD from the extracted text.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title)

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_brd_task
    task = generate_brd_task.delay(str(new_doc.id), extracted_text)

    return {
        "message": "BRD generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }


# ── FRS generation (text-based, Celery) ───────────────────────────────────────

class FRSGenerateRequest(BaseModel):
    context_text: str


@router.post("/{document_id}/generate-frs")
async def trigger_frs_generation(
    document_id: UUID,
    project_id: UUID,           # query param
    body: FRSGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Validate the document exists, then dispatch FRS generation to Celery.
    Returns a task_id to poll via GET /documents/task/{task_id}/status.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.workers.tasks import generate_frs_task
    task = generate_frs_task.delay(str(document_id), body.context_text)
    return {"message": "FRS generation started", "task_id": task.id, "document_id": str(document_id)}


# ── Generate FRS from uploaded file ───────────────────────────────────────────

@router.post("/project/{project_id}/generate-frs-from-file")
async def generate_frs_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a .txt or .docx file, extract its text, create a document record,
    and dispatch a Celery task to generate an FRS from the extracted text.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title)

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_frs_task
    task = generate_frs_task.delay(str(new_doc.id), extracted_text)

    return {
        "message": "FRS generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }


# ── PRS generation (text-based, Celery) ───────────────────────────────────────

class PRSGenerateRequest(BaseModel):
    context_text: str


@router.post("/{document_id}/generate-prs")
async def trigger_prs_generation(
    document_id: UUID,
    project_id: UUID,           # query param
    body: PRSGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Validate the document exists, then dispatch PRS generation to Celery.
    Returns a task_id to poll via GET /documents/task/{task_id}/status.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.workers.tasks import generate_prs_task
    task = generate_prs_task.delay(str(document_id), body.context_text)
    return {"message": "PRS generation started", "task_id": task.id, "document_id": str(document_id)}


# ── Generate PRS from uploaded file ───────────────────────────────────────────

@router.post("/project/{project_id}/generate-prs-from-file")
async def generate_prs_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a .txt or .docx file, extract its text, create a document record,
    and dispatch a Celery task to generate a PRS from the extracted text.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title)

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_prs_task
    task = generate_prs_task.delay(str(new_doc.id), extracted_text)

    return {
        "message": "PRS generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }


# ── Test Case Document generation (text-based, Celery) ────────────────────────

class TestCaseDocGenerateRequest(BaseModel):
    context_text: str


@router.post("/{document_id}/generate-test-case-doc/{project_id}")
async def trigger_test_case_doc_generation(
    document_id: UUID,
    project_id: UUID,
    body: TestCaseDocGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Validate the document exists, then dispatch Test Case document generation to Celery.
    Returns a task_id to poll via GET /documents/task/{task_id}/status.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.workers.tasks import generate_test_case_doc_task
    task = generate_test_case_doc_task.delay(str(document_id), body.context_text)
    return {"message": "Test case document generation started", "task_id": task.id, "document_id": str(document_id)}


# ── Generate Test Case Document from uploaded file ─────────────────────────────

@router.post("/project/{project_id}/generate-test-case-doc-from-file")
async def generate_test_case_doc_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a .txt or .docx file, extract its text, create a document record with
    doc_type='test_case', and dispatch a Celery task to generate a comprehensive
    test case document from the extracted content.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title, doc_type="test_case")

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_test_case_doc_task
    task = generate_test_case_doc_task.delay(str(new_doc.id), extracted_text)

    return {
        "message": "Test case document generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }


@router.post("/project/{project_id}/generate-test-cases-from-file")
async def generate_test_cases_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a BRD document (.txt or .docx), extract its text, create a document
    record, and dispatch a Celery task to generate test cases from the BRD text.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title, content=extracted_text)

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_test_cases_task
    task = generate_test_cases_task.delay(
        str(new_doc.id),
        extracted_text,
        str(project_id),
        str(current_user.org_id),
        str(current_user.id),
    )

    return {
        "message": "Test case generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }



# ── Test Data Document generation (text-based, Celery) ────────────────────────

class TestDataDocGenerateRequest(BaseModel):
    context_text: str


@router.post("/{document_id}/generate-test-data-doc/{project_id}")
async def trigger_test_data_doc_generation(
    document_id: UUID,
    project_id: UUID,
    body: TestDataDocGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Validate the document exists, then dispatch Test Data document generation to Celery.
    Returns a task_id to poll via GET /documents/task/{task_id}/status.
    """
    document_service = DocumentService(db)
    doc = await document_service.get_by_id(document_id, project_id, current_user.org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.workers.tasks import generate_test_data_doc_task
    task = generate_test_data_doc_task.delay(str(document_id), body.context_text)
    return {
        "message": "Test data document generation started",
        "task_id": task.id,
        "document_id": str(document_id),
    }


# ── Generate Test Data Document from uploaded file ─────────────────────────────

@router.post("/project/{project_id}/generate-test-data-doc-from-file")
async def generate_test_data_doc_from_file(
    project_id: UUID,
    title: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Upload a .txt or .docx file, extract its text, create a document record with
    doc_type='test_data_doc', and dispatch a Celery task to generate a comprehensive
    test data document from the extracted content.

    Poll the returned task_id via GET /documents/task/{task_id}/status.
    """
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("txt", "docx"):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .docx files are supported for test data generation",
        )

    try:
        content_bytes = await file.read()
        extracted_text = extract_text_from_upload(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="File appears to be empty or contains no readable text",
        )

    doc_title = title or file.filename
    document_service = DocumentService(db)
    doc_in = DocumentCreate(title=doc_title, doc_type="test_data_doc")

    new_doc = await document_service.create_document(
        org_id=current_user.org_id,
        project_id=project_id,
        created_by=current_user.id,
        obj_in=doc_in,
    )

    from app.workers.tasks import generate_test_data_doc_task
    task = generate_test_data_doc_task.delay(str(new_doc.id), extracted_text)

    return {
        "message": "Test data document generation started",
        "task_id": task.id,
        "document_id": str(new_doc.id),
    }


# ── Polling ───────────────────────────────────────────────────────────────────

@router.get("/task/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Poll the status of a Celery task.
    Possible states: PENDING | STARTED | SUCCESS | FAILURE
    """
    from app.workers.celery_app import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(task_id, app=celery_app)
    response = {
        "task_id": task_id,
        "status": result.status,
    }
    if result.successful():
        response["result"] = result.result
    elif result.failed():
        response["error"] = str(result.result)
    return response

@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    project_id: UUID, # Supplied as query param
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_project_member),
    _: None = Depends(validate_csrf),  # ← CSRF protection
):
    """
    Delete a specific document permanently.
    User must have access to the project.
    """
    document_service = DocumentService(db)
    success = await document_service.delete_document(document_id, project_id, current_user.org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    return {"message": "Document deleted successfully"}
