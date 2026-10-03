"""add ranking_lists and ranking_entries tables

Revision ID: 005
Revises: 004
Create Date: 2026-10-10 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ranking_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("authority", sa.String(200), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("stream", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_ranking_lists_slug", "ranking_lists", ["slug"], unique=True)
    op.create_index("idx_ranking_lists_stream", "ranking_lists", ["stream"])

    op.create_table(
        "ranking_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ranking_list_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ranking_lists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("college_slug", sa.String(200), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("score", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_ranking_entries_list_id", "ranking_entries", ["ranking_list_id"])
    op.create_index("idx_ranking_entries_college_slug", "ranking_entries", ["college_slug"])


def downgrade() -> None:
    op.drop_table("ranking_entries")
    op.drop_table("ranking_lists")
