"""whether a listing is a college or a university

Revision ID: 026
Revises: 025
Create Date: 2026-10-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("institution_type", sa.String(20), nullable=False, server_default="College"))


def downgrade() -> None:
    op.drop_column("colleges", "institution_type")
