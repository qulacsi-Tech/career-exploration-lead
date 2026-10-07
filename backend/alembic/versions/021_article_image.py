"""article image

An article can carry a picture, uploaded in the admin, shown with it on the homepage news and
on its own page. Existing articles start without one; the three that ship with a photo are
given it by the seed data.

Revision ID: 021
Revises: 020
Create Date: 2026-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("image", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("articles", "image")
