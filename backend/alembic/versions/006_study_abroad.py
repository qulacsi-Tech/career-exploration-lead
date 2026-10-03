"""study abroad content table

Revision ID: 006
Revises: 005
Create Date: 2026-10-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_abroad_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("key", sa.String(300), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("kind", "key", name="uq_study_abroad_kind_key"),
    )
    op.create_index("ix_study_abroad_items_kind", "study_abroad_items", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_study_abroad_items_kind", table_name="study_abroad_items")
    op.drop_table("study_abroad_items")
