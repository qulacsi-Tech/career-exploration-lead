"""leads keep everything the visitor typed and the user who sent them, plus counsellor replies

Revision ID: 030
Revises: 029
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leads",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_leads_user_id", "leads", ["user_id"])
    op.add_column("leads", sa.Column("stream", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("message", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("program_name", sa.String(200), nullable=True))
    op.add_column("leads", sa.Column("source", sa.String(60), nullable=True))
    op.add_column("leads", sa.Column("source_url", sa.String(500), nullable=True))
    op.add_column("leads", sa.Column("consent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("leads", sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("repeat_count", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "lead_replies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_name", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_lead_replies_lead_id", "lead_replies", ["lead_id"])


def downgrade() -> None:
    op.drop_index("ix_lead_replies_lead_id", table_name="lead_replies")
    op.drop_table("lead_replies")
    for column in (
        "repeat_count", "consent_at", "consent", "source_url", "source",
        "program_name", "message", "city", "stream",
    ):
        op.drop_column("leads", column)
    op.drop_index("ix_leads_user_id", table_name="leads")
    op.drop_column("leads", "user_id")
