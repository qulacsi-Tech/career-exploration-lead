"""an optional comment on each rating a student gives in a review

Revision ID: 060
Revises: 059
Create Date: 2026-11-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "060"
down_revision = "059"
branch_labels = None
depends_on = None

COLUMNS = ("comment_placements", "comment_faculty", "comment_infrastructure", "comment_campus_life")


def upgrade() -> None:
    for name in COLUMNS:
        op.add_column("reviews", sa.Column(name, sa.Text(), nullable=True))


def downgrade() -> None:
    for name in COLUMNS:
        op.drop_column("reviews", name)
