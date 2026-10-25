"""make specialisations stand alone, and let a college's programme name its specialisation

A specialisation (Finance, Mechanical) no longer has to belong to one course: its course link, and the
course name and stream copied from it, become optional. Links already made are left alone, so the
public course pages keep listing them. A college's programme row gains a `specialisation`, chosen
from the same list, so the college form picks category, course and specialisation separately.

Revision ID: 039
Revises: 038
Create Date: 2026-10-25 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column in ("course_id", "course_slug", "course_name", "stream"):
        op.alter_column("specialisations", column, nullable=True)
    op.add_column("courses", sa.Column("specialisation", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("courses", "specialisation")
    # Specialisations created without a course cannot go back to NOT NULL, so they are removed.
    op.execute("DELETE FROM specialisations WHERE course_id IS NULL")
    for column in ("course_id", "course_slug", "course_name", "stream"):
        op.alter_column("specialisations", column, nullable=False)
