"""practice content table

Revision ID: 009
Revises: 008
Create Date: 2026-10-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "practice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("key", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("kind", "key", name="uq_practice_items_kind_key"),
    )
    op.create_index("ix_practice_items_kind", "practice_items", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_practice_items_kind", table_name="practice_items")
    op.drop_table("practice_items")
