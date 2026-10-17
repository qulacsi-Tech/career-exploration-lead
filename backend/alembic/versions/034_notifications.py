"""notifications

Revision ID: 034
Revises: 033
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recipient_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(60), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(300), nullable=True),
        sa.Column("requires_ack", sa.Boolean(), nullable=False, server_default=sa.false()),
        # Notifications about the same thing, sent to several people, share a key. When one of them
        # deals with it, the others are marked as handled.
        sa.Column("group_key", sa.String(120), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cleared_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_name", sa.String(200), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_recipient", "notifications", ["recipient_id", "cleared_at", "created_at"])
    op.create_index("ix_notifications_group_key", "notifications", ["group_key"])


def downgrade() -> None:
    op.drop_index("ix_notifications_group_key", table_name="notifications")
    op.drop_index("ix_notifications_recipient", table_name="notifications")
    op.drop_table("notifications")
