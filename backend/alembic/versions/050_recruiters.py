"""a shared pool of recruiters, with logos

`recruiters`: one row per company, however many colleges list it, unique ignoring case and spacing. Filled here
from every name already on a placement record, so nothing has to be typed again.

Revision ID: 050
Revises: 049
Create Date: 2026-10-29 00:00:00.000000
"""

import json
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "050"
down_revision = "049"
branch_labels = None
depends_on = None


def _key(name: str) -> str:
    return " ".join(name.split()).lower()


def upgrade() -> None:
    op.create_table(
        "recruiters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("name_key", sa.String(120), nullable=False),
        sa.Column("logo", sa.String(200), nullable=False, server_default=""),
        sa.Column("show_name", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_recruiters_name_key", "recruiters", ["name_key"], unique=True)

    # The companies already named on placements, once each (the first spelling met wins).
    bind = op.get_bind()
    seen: dict[str, str] = {}
    for (names,) in bind.execute(sa.text("SELECT top_recruiters FROM placements")):
        for raw in (names if isinstance(names, list) else json.loads(names or "[]")):
            name = " ".join(str(raw).split())
            if name and len(name) <= 120:
                seen.setdefault(_key(name), name)
    for key, name in sorted(seen.items(), key=lambda kv: kv[1].lower()):
        bind.execute(
            sa.text("INSERT INTO recruiters (id, name, name_key) VALUES (:id, :name, :key)"),
            {"id": str(uuid.uuid4()), "name": name, "key": key},
        )


def downgrade() -> None:
    op.drop_index("ix_recruiters_name_key", table_name="recruiters")
    op.drop_table("recruiters")
