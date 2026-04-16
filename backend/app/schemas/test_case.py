from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any

from app.models.test_case import TestCaseSource, TestType

class TestCaseBase(BaseModel):
    title: str
    source: TestCaseSource = TestCaseSource.brd
    test_type: TestType = TestType.system
    content: Any  # JSON content

class TestCaseCreate(TestCaseBase):
    document_id: Optional[UUID] = None
    file_path: Optional[str] = None

class TestCaseResponse(TestCaseBase):
    id: UUID
    org_id: UUID
    project_id: UUID
    document_id: Optional[UUID]
    created_by: UUID
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
