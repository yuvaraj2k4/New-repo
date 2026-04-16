from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from typing import Dict
from uuid import UUID

from app.core.dependencies import get_current_user, validate_csrf
from app.services.file_service import FileService
from app.models.user import User

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(validate_csrf),  # ← CSRF protection
) -> Dict[str, str]:
    file_service = FileService()
    # Simple validation using content_type or file extension could be added here
    stored_name = await file_service.upload_file(file, prefix=f"org_{current_user.org_id}/")
    return {"filename": stored_name}

@router.get("/download/{stored_name}")
async def get_download_url(
    stored_name: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    file_service = FileService()
    url = file_service.get_presigned_url(stored_name)
    if not url:
        raise HTTPException(status_code=404, detail="File not found or URL generation failed")
    return {"url": url}
