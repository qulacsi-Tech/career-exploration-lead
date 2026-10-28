"""an online offering can be switched off without losing it

`courses.online_enabled`: the Online Programmes screen lists every online offering a college has
entered and can disable one. Disabled, it is kept but not shown on the site.

Revision ID: 049
Revises: 048
Create Date: 2026-10-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "049"
down_revision = "048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("online_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("courses", "online_enabled")
