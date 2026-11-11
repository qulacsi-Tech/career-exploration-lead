"""messages from the platform team to newsletter subscribers

`team_messages`: one row per message (a broadcast to every subscriber, or to chosen ones). `team_message_recipients`:
one row per address it went to, in the student's Messages inbox when they have an account, with read state.

Revision ID: 070
Revises: 069
Create Date: 2026-11-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "070"
down_revision = "069"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "team_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("audience", sa.String(20), nullable=False, server_default="selected"),
        sa.Column("also_email", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sent_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sent_by_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_team_messages_sent_at", "team_messages", ["sent_at"])
    op.create_table(
        "team_message_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("team_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("emailed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_team_message_recipients_message_id", "team_message_recipients", ["message_id"])
    op.create_index("ix_team_message_recipients_user_id", "team_message_recipients", ["user_id"])


def downgrade() -> None:
    op.drop_table("team_message_recipients")
    op.drop_table("team_messages")
