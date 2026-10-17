"""student accounts: Google sign-in and profile fields

Revision ID: 029
Revises: 028
Create Date: 2026-10-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A Google-only account has no password.
    op.alter_column("users", "password_hash", existing_type=sa.String(72), nullable=True)
    op.add_column("users", sa.Column("auth_provider", sa.String(20), nullable=False, server_default="password"))
    op.add_column("users", sa.Column("google_sub", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("preferred_stream", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("target_exam", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("marketing_consent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("consent_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_google_sub", table_name="users")
    for column in (
        "consent_at", "marketing_consent", "target_exam", "preferred_stream", "state", "city",
        "is_active", "last_login_at", "email_verified_at", "avatar_url", "google_sub", "auth_provider",
    ):
        op.drop_column("users", column)
    # Google-only rows have no password, so give them an unusable one before the column is required again.
    op.execute("UPDATE users SET password_hash = '!' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(72), nullable=False)
