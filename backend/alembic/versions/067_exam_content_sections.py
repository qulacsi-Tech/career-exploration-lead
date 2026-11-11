"""exam page content built with the section editor

`exams.content_sections`: sections of blocks (text, lists, tables, steps, notes, quotes, key facts, images) written in
the admin with the same editor as news articles, shown on the exam's page.

Revision ID: 067
Revises: 066
Create Date: 2026-11-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "067"
down_revision = "066"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("content_sections", postgresql.JSONB(), nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("exams", "content_sections")
