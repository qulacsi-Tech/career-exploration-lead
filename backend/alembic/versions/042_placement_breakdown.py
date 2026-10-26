"""placements broken down by category, course and specialisation

`placements.breakdown` lists, for one batch year, the average and highest package and the number
placed for each category / course / specialisation of the college. The year's own figures stay as
the overall ones. Starts empty.

Revision ID: 042
Revises: 041
Create Date: 2026-10-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("placements", sa.Column("breakdown", JSONB, nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("placements", "breakdown")
