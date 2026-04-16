import uuid
import enum
from sqlalchemy import String, Text, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DocType(str, enum.Enum):
    brd = "brd"
    frs = "frs"
    prs = "prs"
    design_doc = "design_doc"
    test_case = "test_case"
    test_data_doc = "test_data_doc"


class Document(Base):
    __tablename__ = "documents"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    doc_type: Mapped[DocType] = mapped_column(
        Enum(DocType, name="doc_type"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="documents", lazy="noload")
    test_cases: Mapped[list["TestCase"]] = relationship("TestCase", back_populates="document", lazy="noload")
