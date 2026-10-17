"""visitor tracking: visitors, visits and events, and the visitor on a lead

Revision ID: 031
Revises: 030
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "visitors",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("first_landing_path", sa.String(300), nullable=True),
        sa.Column("first_referrer", sa.String(500), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(150), nullable=True),
        sa.Column("device_type", sa.String(20), nullable=True),
        sa.Column("browser", sa.String(30), nullable=True),
        sa.Column("os", sa.String(30), nullable=True),
    )
    op.create_index("ix_visitors_user_id", "visitors", ["user_id"])
    op.create_index("ix_visitors_last_seen_at", "visitors", ["last_seen_at"])

    op.create_table(
        "visit_sessions",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("visitor_id", UUID, sa.ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("landing_path", sa.String(300), nullable=True),
        sa.Column("referrer", sa.String(500), nullable=True),
        sa.Column("source", sa.String(150), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(150), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("event_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_visit_sessions_visitor_id", "visit_sessions", ["visitor_id"])
    op.create_index("ix_visit_sessions_user_id", "visit_sessions", ["user_id"])
    op.create_index("ix_visit_sessions_started_at", "visit_sessions", ["started_at"])
    op.create_index("ix_visit_sessions_source", "visit_sessions", ["source"])

    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("visitor_id", UUID, sa.ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", UUID, sa.ForeignKey("visit_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("path", sa.String(300), nullable=True),
        sa.Column("properties", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("college_slug", sa.String(200), nullable=True),
        sa.Column("exam_slug", sa.String(200), nullable=True),
        sa.Column("program_slug", sa.String(200), nullable=True),
    )
    op.create_index("ix_events_visitor_id", "events", ["visitor_id"])
    op.create_index("ix_events_session_id", "events", ["session_id"])
    op.create_index("ix_events_user_id", "events", ["user_id"])
    op.create_index("ix_events_occurred_at", "events", ["occurred_at"])
    op.create_index("ix_events_name", "events", ["name"])
    op.create_index("ix_events_college_slug", "events", ["college_slug"])

    # The browser behind a lead, so an admin can read what led up to it. No foreign key: the
    # lead is kept even if the visitor's activity is later cleared.
    op.add_column("leads", sa.Column("visitor_id", UUID, nullable=True))
    op.create_index("ix_leads_visitor_id", "leads", ["visitor_id"])


def downgrade() -> None:
    op.drop_index("ix_leads_visitor_id", table_name="leads")
    op.drop_column("leads", "visitor_id")
    op.drop_table("events")
    op.drop_table("visit_sessions")
    op.drop_table("visitors")
