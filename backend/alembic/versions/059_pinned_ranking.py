"""the ranking an admin pins on a college's Rankings tab

`colleges.pinned_ranking`: slug of the ranking list shown as the big figure; empty means none is pinned.

Revision ID: 059
Revises: 058
Create Date: 2026-11-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "059"
down_revision = "058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("pinned_ranking", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("colleges", "pinned_ranking")
