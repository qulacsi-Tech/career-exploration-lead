"""a community for every exam

Communities are now made by the platform with each exam, not started by a student. This gives every existing exam
that has none an empty community, so the admin lists them all and students can join any of them straight away.

Revision ID: 076
Revises: 075
Create Date: 2026-11-18 00:00:00.000000
"""

from alembic import op

revision = "076"
down_revision = "075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO communities (id, exam_id, description, created_by, is_restricted, created_at)
        SELECT gen_random_uuid(), e.id, '', NULL, false, now()
        FROM exams e
        WHERE NOT EXISTS (SELECT 1 FROM communities c WHERE c.exam_id = e.id)
        """
    )


def downgrade() -> None:
    # Empty communities made here are left: they hold nothing, and removing them could not tell them apart from
    # ones students have since joined.
    pass
