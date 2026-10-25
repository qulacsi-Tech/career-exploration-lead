"""a college can sit under several categories

`colleges.streams` lists every category the college is listed under; `stream` stays as the first of
them, which is what the single-category pages, cards and filters already read. Starts from the one
category each college has.

Revision ID: 041
Revises: 040
Create Date: 2026-10-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("streams", JSONB, nullable=False, server_default="[]"))
    op.execute("UPDATE colleges SET streams = jsonb_build_array(stream) WHERE stream IS NOT NULL AND stream <> ''")


def downgrade() -> None:
    op.drop_column("colleges", "streams")
