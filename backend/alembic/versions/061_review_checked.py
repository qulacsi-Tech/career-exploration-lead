"""reviews go live at once; `checked` says whether the team has looked at one yet

Existing reviews count as checked. A new review is saved unchecked and shown straight away; the team checks it later,
and can hide or remove it.

Revision ID: 061
Revises: 060
Create Date: 2026-11-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "061"
down_revision = "060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("checked", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("reviews", "checked")
