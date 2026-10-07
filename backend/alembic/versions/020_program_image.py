"""programme photo

A programme card on the homepage Recommended row can carry its own photo, uploaded in the
admin. Existing programmes start without one and keep using the site's shared photo set.

Revision ID: 020
Revises: 019
Create Date: 2026-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("image", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("programs", "image")
