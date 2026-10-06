"""featured categories and colleges on a location card

An admin picks which categories (streams) a homepage destination card offers and, under
each, which colleges it lists. Stored as [{"stream": "Engineering", "colleges": ["slug"]}].
Empty means the card works the categories out from the colleges in the city.

Revision ID: 017
Revises: 016
Create Date: 2026-10-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "locations",
        sa.Column("featured", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.drop_column("locations", "featured")
