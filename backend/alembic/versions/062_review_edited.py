"""when a student last edited their review (empty: never)

Revision ID: 062
Revises: 061
Create Date: 2026-11-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "062"
down_revision = "061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("reviews", "edited_at")
