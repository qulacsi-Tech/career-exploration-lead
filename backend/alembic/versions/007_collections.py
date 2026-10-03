"""collections table

Revision ID: 007
Revises: 006
Create Date: 2026-10-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("slug", name="uq_collections_slug"),
    )
    op.create_index("ix_collections_slug", "collections", ["slug"])


def downgrade() -> None:
    op.drop_index("ix_collections_slug", table_name="collections")
    op.drop_table("collections")
