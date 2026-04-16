"""add_test_case_doctype

Revision ID: b4c5d6e7f8a9
Revises: 13c06fa0ea36
Create Date: 2026-04-13 09:55:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8a9'
down_revision: Union[str, None] = '13c06fa0ea36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL supports IF NOT EXISTS for enum values (prevents idempotency errors)
    op.execute("ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'test_case'")


def downgrade() -> None:
    # PostgreSQL does not support removing individual enum values.
    # A full enum recreation would be required; intentionally left as no-op.
    pass
