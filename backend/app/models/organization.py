import enum
from sqlalchemy import String, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class OrgStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"


class Organization(Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[OrgStatus] = mapped_column(
        Enum(OrgStatus, name="org_status"),
        default=OrgStatus.active,
        nullable=False,
    )

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="organization", lazy="noload")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="organization", lazy="noload")
