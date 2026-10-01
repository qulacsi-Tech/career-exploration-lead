"""add author, category, read_minutes, related_college_slugs to articles

Revision ID: 002
Revises: 001
Create Date: 2026-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("author", sa.String(200), nullable=True, server_default="Editorial Desk"))
    op.add_column("articles", sa.Column("category", sa.String(100), nullable=True))
    op.add_column("articles", sa.Column("read_minutes", sa.Integer(), nullable=True, server_default="5"))
    op.add_column("articles", sa.Column("related_college_slugs", sa.Text(), nullable=True, server_default=""))


def downgrade() -> None:
    op.drop_column("articles", "related_college_slugs")
    op.drop_column("articles", "read_minutes")
    op.drop_column("articles", "category")
    op.drop_column("articles", "author")
