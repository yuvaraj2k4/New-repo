import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class ProjectStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class MemberRole(str, enum.Enum):
    manager = "manager"
    member = "member"


class Project(Base):
    __tablename__ = "projects"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    project_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        default=ProjectStatus.active,
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="projects", lazy="noload")
    members: Mapped[list["ProjectMember"]] = relationship("ProjectMember", back_populates="project", lazy="noload", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="project", lazy="noload")
    test_cases: Mapped[list["TestCase"]] = relationship("TestCase", back_populates="project", lazy="noload")
    test_data: Mapped[list["TestData"]] = relationship("TestData", back_populates="project", lazy="noload")
    uploaded_files: Mapped[list["UploadedFile"]] = relationship("UploadedFile", back_populates="project", lazy="noload")


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role"),
        default=MemberRole.member,
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="members", lazy="noload")
    user: Mapped["User"] = relationship("User", back_populates="project_members", lazy="noload")
