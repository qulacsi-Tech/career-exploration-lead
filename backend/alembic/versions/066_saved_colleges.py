"""colleges a student saved to their profile

`saved_colleges`: one row for each signed-in student and college they saved. The student sees them under My account,
and the college's admin and the platform team see who saved it.

Revision ID: 066
Revises: 065
Create Date: 2026-11-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "066"
down_revision = "065"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_colleges",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("college_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("colleges.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_saved_colleges_college_id", "saved_colleges", ["college_id"])


def downgrade() -> None:
    op.drop_table("saved_colleges")
