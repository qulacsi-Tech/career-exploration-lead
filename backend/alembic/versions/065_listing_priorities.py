"""priorities within each filter of the college listing

`listing_priorities`: for a scope such as `course=MBA` or `city=Pune`, the place each promoted college takes.
Several colleges may share a number.

Revision ID: 065
Revises: 064
Create Date: 2026-11-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "065"
down_revision = "064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listing_priorities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scope", sa.String(300), nullable=False),
        sa.Column("college_slug", sa.String(200), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.UniqueConstraint("scope", "college_slug", name="uq_listing_priority_scope_college"),
    )
    op.create_index("ix_listing_priorities_scope", "listing_priorities", ["scope"])
    op.create_index("ix_listing_priorities_college_slug", "listing_priorities", ["college_slug"])


def downgrade() -> None:
    op.drop_table("listing_priorities")
