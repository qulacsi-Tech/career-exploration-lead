"""college admin accounts: a role, the college it belongs to, and a forced first password change

Revision ID: 033
Revises: 032
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'COLLEGE_ADMIN'")

    op.add_column(
        "users",
        sa.Column("college_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("colleges.id", ondelete="SET NULL"), nullable=True),
    )
    # One college admin per college, enforced by the database and not only by the form.
    op.create_index(
        "uq_users_one_college_admin",
        "users",
        ["college_id"],
        unique=True,
        postgresql_where=sa.text("role = 'COLLEGE_ADMIN'"),
    )
    op.create_index("ix_users_college_id", "users", ["college_id"])
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
    op.drop_index("ix_users_college_id", table_name="users")
    op.drop_index("uq_users_one_college_admin", table_name="users")
    op.drop_column("users", "college_id")
    # The enum value stays; Postgres cannot drop one. Nobody holds it once these rows are gone.
    op.execute("DELETE FROM users WHERE role = 'COLLEGE_ADMIN'")
