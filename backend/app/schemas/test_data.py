from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any

class TestDataBase(BaseModel):
    content: Any  # JSON content

class TestDataCreate(TestDataBase):
    test_case_id: UUID
    file_path: Optional[str] = None

class TestDataResponse(TestDataBase):
    id: UUID
    org_id: UUID
    project_id: UUID
    test_case_id: UUID
    created_by: UUID
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
