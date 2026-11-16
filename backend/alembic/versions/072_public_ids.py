"""numeric public ids for colleges, exams and articles

`public_id` is the short number in a page's address: /college/iit-bombay-29. The UUID primary key
stays the key everything else points at; this is only for the URL. Each table has its own sequence,
so an id is never reused after a row is deleted.

Revision ID: 072
Revises: 071
Create Date: 2026-11-16 00:00:00.000000
"""

from alembic import op

revision = "072"
down_revision = "071"
branch_labels = None
depends_on = None

TABLES = ("colleges", "exams", "articles")


def upgrade() -> None:
    for t in TABLES:
        seq = f"{t}_public_id_seq"
        op.execute(f"CREATE SEQUENCE IF NOT EXISTS {seq}")
        # A volatile default fills the existing rows too, one number each.
        op.execute(f"ALTER TABLE {t} ADD COLUMN public_id INTEGER NOT NULL DEFAULT nextval('{seq}')")
        op.execute(f"ALTER SEQUENCE {seq} OWNED BY {t}.public_id")
        op.create_index(f"ix_{t}_public_id", t, ["public_id"], unique=True)


def downgrade() -> None:
    for t in TABLES:
        op.drop_index(f"ix_{t}_public_id", table_name=t)
        op.execute(f"ALTER TABLE {t} DROP COLUMN public_id")
        op.execute(f"DROP SEQUENCE IF EXISTS {t}_public_id_seq")
