"""change requests from college admins, and message threads with the platform team

Revision ID: 035
Revises: 034
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "change_requests",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("college_id", UUID, sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_by_name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False),  # edit | delete
        sa.Column("payload", postgresql.JSONB(), nullable=True),  # the whole proposed college record, for an edit
        sa.Column("note", sa.Text(), nullable=True),  # why, in the college admin's words
        sa.Column("base_updated_at", sa.String(40), nullable=True),  # the live record's version they started from
        sa.Column("status", sa.String(12), nullable=False, server_default="pending"),  # pending | approved | rejected | withdrawn
        sa.Column("reviewed_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_by_name", sa.String(200), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_change_requests_college", "change_requests", ["college_id", "created_at"])
    op.create_index("ix_change_requests_status", "change_requests", ["status", "created_at"])
    # One open request per college at a time, enforced by the database.
    op.create_index(
        "uq_change_requests_one_pending",
        "change_requests",
        ["college_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )

    op.create_table(
        "message_threads",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("college_id", UUID, sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False),
        sa.Column("change_request_id", UUID, sa.ForeignKey("change_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="open"),  # open | resolved
        sa.Column("created_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_by_name", sa.String(200), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_message_threads_college", "message_threads", ["college_id", "updated_at"])
    op.create_index("ix_message_threads_status", "message_threads", ["status", "updated_at"])

    op.create_table(
        "thread_messages",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("thread_id", UUID, sa.ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sender_name", sa.String(200), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),  # college | platform
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_thread_messages_thread", "thread_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    op.drop_table("thread_messages")
    op.drop_table("message_threads")
    op.drop_table("change_requests")
