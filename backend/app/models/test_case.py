import uuid
import enum
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class TestCaseSource(str, enum.Enum):
    brd = "brd"
    api_spec = "api_spec"
    jira = "jira"
    manual = "manual"


class TestType(str, enum.Enum):
    unit = "unit"
    system = "system"
    integration = "integration"
    uat = "uat"


class TestCase(Base):
    __tablename__ = "test_cases"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[TestCaseSource] = mapped_column(
        Enum(TestCaseSource, name="test_case_source"), nullable=False, default=TestCaseSource.brd
    )
    test_type: Mapped[TestType] = mapped_column(
        Enum(TestType, name="test_type"), nullable=False, default=TestType.system
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="test_cases", lazy="noload")
    document: Mapped["Document | None"] = relationship("Document", back_populates="test_cases", lazy="noload")
    test_data: Mapped[list["TestData"]] = relationship("TestData", back_populates="test_case", lazy="noload")
