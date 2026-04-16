"""add_test_data_doc_doctype

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-04-13 13:21:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL supports IF NOT EXISTS for enum values (prevents idempotency errors on re-run)
    op.execute("ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'test_data_doc'")


def downgrade() -> None:
    # PostgreSQL does not support removing individual enum values.
    # A full enum recreation would be required; intentionally left as no-op.
    pass
