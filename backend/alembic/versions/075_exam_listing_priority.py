"""exam listing priority

`exams.listing_priority`: the exam's place on the exams listing, set in the admin (1 is first). Null: no priority;
the listing then goes by the soonest exam date, with exams whose registration has closed at the bottom.

Revision ID: 075
Revises: 074
Create Date: 2026-11-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "075"
down_revision = "074"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("listing_priority", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("exams", "listing_priority")
