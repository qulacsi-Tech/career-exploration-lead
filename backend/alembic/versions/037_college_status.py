"""give a college a status: draft, published or archived

Existing colleges stay published. A college added in the admin starts as a draft.

Revision ID: 037
Revises: 036
Create Date: 2026-10-23 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("status", sa.String(20), nullable=False, server_default="published"))
    op.create_index("ix_colleges_status", "colleges", ["status"])


def downgrade() -> None:
    op.drop_index("ix_colleges_status", table_name="colleges")
    op.drop_column("colleges", "status")
