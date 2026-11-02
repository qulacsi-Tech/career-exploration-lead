"""student questions to a college, their answers, and "helpful" votes

`questions`: what a signed-in student asked a college (a question or a concern), the latest answer and who gave it
(the college or the platform's Career Experts), and whether the platform team has approved the pair for the
college's Q&A page. `question_helpful`: one vote per student per published question.

Revision ID: 054
Revises: 053
Create Date: 2026-11-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "054"
down_revision = "053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("college_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(10), nullable=False, server_default="question"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("answered_by_role", sa.String(10), nullable=True),
        sa.Column("answered_by_name", sa.String(200), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_questions_college_id", "questions", ["college_id"])
    op.create_index("ix_questions_user_id", "questions", ["user_id"])
    op.create_index("ix_questions_is_published", "questions", ["is_published"])
    op.create_table(
        "question_helpful",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("question_helpful")
    op.drop_index("ix_questions_is_published", table_name="questions")
    op.drop_index("ix_questions_user_id", table_name="questions")
    op.drop_index("ix_questions_college_id", table_name="questions")
    op.drop_table("questions")
