# Central import file — ensures all models are registered with SQLAlchemy's
# metadata before Alembic runs autogenerate.

from app.db.base import Base  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.project import Project, ProjectMember  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.test_case import TestCase  # noqa: F401
from app.models.test_data import TestData  # noqa: F401
from app.models.uploaded_file import UploadedFile  # noqa: F401
