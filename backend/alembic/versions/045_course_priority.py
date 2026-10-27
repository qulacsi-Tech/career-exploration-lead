"""a priority order for catalogue courses

`course_catalogue.priority` puts a course ahead of others in the Courses list and menu: 1 first, then 2,
and so on. A course with none comes after those that have one. Starts empty.

Revision ID: 045
Revises: 044
Create Date: 2026-10-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "045"
down_revision = "044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("course_catalogue", sa.Column("priority", sa.Integer(), nullable=True))
    op.create_index("ix_course_catalogue_priority", "course_catalogue", ["priority"])


def downgrade() -> None:
    op.drop_index("ix_course_catalogue_priority", table_name="course_catalogue")
    op.drop_column("course_catalogue", "priority")
