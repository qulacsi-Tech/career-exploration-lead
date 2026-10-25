"""courses sit under categories and specialisations under courses, several each

A course lists the categories it belongs to (`streams`) and a specialisation the courses it belongs to
(`course_slugs`), so the college form can offer only what fits the parent chosen above it. Both start
from the single parent each row already had. The columns that only the old forms asked for (full name,
level, duration) get an empty default, since the catalogue forms now take a name and parents only.

Revision ID: 040
Revises: 039
Create Date: 2026-10-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "040"
down_revision = "039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("course_catalogue", sa.Column("streams", JSONB, nullable=False, server_default="[]"))
    op.add_column("specialisations", sa.Column("course_slugs", JSONB, nullable=False, server_default="[]"))
    op.execute("UPDATE course_catalogue SET streams = jsonb_build_array(stream) WHERE stream IS NOT NULL AND stream <> ''")
    op.execute("UPDATE specialisations SET course_slugs = jsonb_build_array(course_slug) WHERE course_slug IS NOT NULL")
    for column in ("full_name", "level", "duration"):
        op.alter_column("course_catalogue", column, server_default="")


def downgrade() -> None:
    for column in ("full_name", "level", "duration"):
        op.alter_column("course_catalogue", column, server_default=None)
    op.drop_column("specialisations", "course_slugs")
    op.drop_column("course_catalogue", "streams")
