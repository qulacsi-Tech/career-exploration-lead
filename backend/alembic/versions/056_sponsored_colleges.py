"""sponsored colleges, and the leads shared with them

`colleges.is_sponsored`: the college has paid to receive leads. `lead_shares`: one row for each lead the platform
team has shared with a sponsored college (a lead is shared with a college once). The college's admin sees shared
leads in their Leads inbox alongside the leads for their own college.

Revision ID: 056
Revises: 055
Create Date: 2026-11-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "056"
down_revision = "055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("is_sponsored", sa.Boolean(), nullable=False, server_default="false"))
    op.create_table(
        "lead_shares",
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("college_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("colleges.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("shared_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("shared_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_lead_shares_college_id", "lead_shares", ["college_id"])


def downgrade() -> None:
    op.drop_index("ix_lead_shares_college_id", table_name="lead_shares")
    op.drop_table("lead_shares")
    op.drop_column("colleges", "is_sponsored")
