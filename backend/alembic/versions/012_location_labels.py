"""reusable location labels

Replaces the two fixed tag columns on locations with a shared list of labels that
any number of locations can carry. Existing tags are carried over: each distinct
text becomes one label, assigned to the locations that had it.

Revision ID: 012
Revises: 011
Create Date: 2026-10-04 00:00:00.000000
"""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "location_labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("text", sa.String(60), nullable=False, unique=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "location_label_links",
        sa.Column("label_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("location_labels.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
    )

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, tagline, highlight FROM locations ORDER BY home_order, name")).fetchall()
    label_ids: dict[str, uuid.UUID] = {}
    for location_id, tagline, highlight in rows:
        for text in (tagline, highlight):
            text = (text or "").strip()
            if not text:
                continue
            if text not in label_ids:
                label_ids[text] = uuid.uuid4()
                conn.execute(
                    sa.text("INSERT INTO location_labels (id, text, position) VALUES (:i, :t, :p)"),
                    {"i": label_ids[text], "t": text, "p": len(label_ids) - 1},
                )
            conn.execute(
                sa.text("INSERT INTO location_label_links (label_id, location_id) VALUES (:l, :c)"),
                {"l": label_ids[text], "c": location_id},
            )

    op.drop_column("locations", "tagline")
    op.drop_column("locations", "highlight")


def downgrade() -> None:
    op.add_column("locations", sa.Column("tagline", sa.String(120), nullable=False, server_default=""))
    op.add_column("locations", sa.Column("highlight", sa.String(120), nullable=False, server_default=""))

    # Put each location's first two labels (in label order) back in the fixed boxes.
    conn = op.get_bind()
    links = conn.execute(sa.text(
        "SELECT k.location_id, l.text FROM location_label_links k "
        "JOIN location_labels l ON l.id = k.label_id ORDER BY k.location_id, l.position"
    )).fetchall()
    seen: dict = {}
    for location_id, text in links:
        n = seen.get(location_id, 0)
        if n < 2:
            column = "tagline" if n == 0 else "highlight"
            conn.execute(sa.text(f"UPDATE locations SET {column} = :t WHERE id = :i"), {"t": text, "i": location_id})
        seen[location_id] = n + 1

    op.drop_table("location_label_links")
    op.drop_table("location_labels")
