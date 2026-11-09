"""replies to reviews, and replies to replies

`review_replies`: one row for each reply. `parent_id` is the reply it answers (empty: it answers the review itself),
so a thread of any depth is stored; the page shows it nested.

Revision ID: 063
Revises: 062
Create Date: 2026-11-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "063"
down_revision = "062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_replies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("review_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("review_replies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author_name", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_review_replies_review_id", "review_replies", ["review_id"])
    op.create_index("ix_review_replies_parent_id", "review_replies", ["parent_id"])


def downgrade() -> None:
    op.drop_table("review_replies")
