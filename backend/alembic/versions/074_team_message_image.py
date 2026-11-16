"""a picture on a team message

`team_messages.image`: an optional banner or picture sent with a broadcast or direct message (/api/uploads/...).
Empty: none.

Revision ID: 074
Revises: 073
Create Date: 2026-11-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "074"
down_revision = "073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("team_messages", sa.Column("image", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("team_messages", "image")
