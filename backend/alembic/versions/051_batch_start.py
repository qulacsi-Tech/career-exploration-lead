"""a placement batch is a range of years

`placements.year_start`: the year the batch began. `year` stays the year it ended (what a record is ordered and
kept unique by), so a batch of 2022-2024 is year_start 2022, year 2024. Empty: a single year, as before.

Revision ID: 051
Revises: 050
Create Date: 2026-10-29 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "051"
down_revision = "050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("placements", sa.Column("year_start", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("placements", "year_start")
