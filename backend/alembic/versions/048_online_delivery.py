"""online delivery: catalogue availability and a college's online offering

Categories (home_fields), courses (course_catalogue) and specialisations each say whether they are
taught offline, online or both (`delivery`, default offline). A college's programme row can also be
offered online, with its own duration and fees: `courses.online_offered`, `online_duration`,
`online_fees`.

Revision ID: 048
Revises: 047
Create Date: 2026-10-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "048"
down_revision = "047"
branch_labels = None
depends_on = None

CATALOGUE = ("home_fields", "course_catalogue", "specialisations")


def upgrade() -> None:
    for table in CATALOGUE:
        op.add_column(table, sa.Column("delivery", sa.String(10), nullable=False, server_default="offline"))
    op.add_column("courses", sa.Column("online_offered", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("courses", sa.Column("online_duration", sa.String(100), nullable=False, server_default=""))
    op.add_column("courses", sa.Column("online_fees", sa.String(200), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("courses", "online_fees")
    op.drop_column("courses", "online_duration")
    op.drop_column("courses", "online_offered")
    for table in reversed(CATALOGUE):
        op.drop_column(table, "delivery")
