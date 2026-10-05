"""course categories and fee ranges on a location card

Each homepage destination card can list up to three course categories with their fee
range (for example MBA, 6L - 24L). They are entered in the admin, so existing rows
start empty.

Revision ID: 016
Revises: 015
Create Date: 2026-10-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "locations",
        sa.Column("course_fees", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column("locations", "course_fees")
