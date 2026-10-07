"""programmes can be switched off

An inactive programme keeps its record and its place in the admin but is not shown on the
site: it drops out of the homepage Recommended row until it is switched back on. Existing
programmes stay active.

Revision ID: 019
Revises: 018
Create Date: 2026-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))


def downgrade() -> None:
    op.drop_column("programs", "is_active")
