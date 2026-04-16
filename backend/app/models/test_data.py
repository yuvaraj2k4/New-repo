import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class TestData(Base):
    __tablename__ = "test_data"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="test_data", lazy="noload")
    test_case: Mapped["TestCase | None"] = relationship("TestCase", back_populates="test_data", lazy="noload")
