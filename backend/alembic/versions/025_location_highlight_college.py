"""the sponsored college on a location card

A homepage location card can highlight one college in the location. This is that college's slug.
The card shows the college's own photo unless the admin uploads another for the card. Empty: no
highlighted college.

Revision ID: 025
Revises: 024
Create Date: 2026-10-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("locations", sa.Column("highlight_college", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("locations", "highlight_college")
