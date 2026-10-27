"""a default priority order for colleges

`colleges.priority` puts a college ahead of others in the lists the site shows: 1 first, then 2, and
so on. A college with none comes after those that have one, ordered by its NIRF rank. Starts empty.

Revision ID: 044
Revises: 043
Create Date: 2026-10-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "044"
down_revision = "043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("colleges", sa.Column("priority", sa.Integer(), nullable=True))
    op.create_index("ix_colleges_priority", "colleges", ["priority"])


def downgrade() -> None:
    op.drop_index("ix_colleges_priority", table_name="colleges")
    op.drop_column("colleges", "priority")
