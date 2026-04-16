from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.models.document import DocType

class DocumentBase(BaseModel):
    title: str
    doc_type: DocType = DocType.brd
    version: int = 1

class DocumentCreate(DocumentBase):
    content: Optional[str] = None
    file_path: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: UUID
    org_id: UUID
    project_id: UUID
    created_by: UUID
    content: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
