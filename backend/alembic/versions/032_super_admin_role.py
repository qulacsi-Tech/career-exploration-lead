"""a Super Admin role above Admin

Revision ID: 032
Revises: 031
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A new enum value cannot be used in the transaction that adds it, so it is added on its own.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'")

    # Somebody has to be able to create the other administrators. If nobody is a super admin yet,
    # the oldest admin account (the one the deploy created) becomes one.
    op.execute(
        """
        UPDATE users SET role = 'SUPER_ADMIN'
        WHERE id = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1)
          AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN')
        """
    )


def downgrade() -> None:
    # Postgres cannot drop a value from an enum, so the value stays; nobody holds it any more.
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'SUPER_ADMIN'")
