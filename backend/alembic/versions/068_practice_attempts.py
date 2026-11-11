"""practice test attempts kept on the student's profile

`practice_attempts`: one row for each finished sitting of a practice test, with its score. `leadtype` gains
"practice": the lead made for each student and exam, so test-takers can be shared with sponsored colleges.

Revision ID: 068
Revises: 067
Create Date: 2026-11-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "068"
down_revision = "067"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "practice_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("test_slug", sa.String(200), nullable=False),
        sa.Column("exam_slug", sa.String(200), nullable=False),
        sa.Column("test_title", sa.String(200), nullable=False, server_default=""),
        sa.Column("exam_name", sa.String(500), nullable=False, server_default=""),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("max_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("incorrect", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sections", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_practice_attempts_user_id", "practice_attempts", ["user_id"])
    op.create_index("ix_practice_attempts_test_slug", "practice_attempts", ["test_slug"])
    op.create_index("ix_practice_attempts_exam_slug", "practice_attempts", ["exam_slug"])
    op.create_index("ix_practice_attempts_submitted_at", "practice_attempts", ["submitted_at"])

    # A new value of an existing Postgres enum cannot be added inside the migration's transaction on older versions.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE leadtype ADD VALUE IF NOT EXISTS 'practice'")


def downgrade() -> None:
    op.drop_table("practice_attempts")
    # Postgres cannot drop a value from an enum; "practice" stays in leadtype, unused.
