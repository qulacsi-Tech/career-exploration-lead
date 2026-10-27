"""collections in the header menu now sit in a category

A collection used to carry its own "show in the header menu" placement, which listed it under one
fixed "Featured Collections" group. The menu's categories are now chosen in the navigation settings,
so each collection flagged that way moves into an added category of that name, which the admin can
rename, reorder or delete. The placement is removed from the collection.

Revision ID: 043
Revises: 042
Create Date: 2026-10-27 00:00:00.000000
"""

import json

from alembic import op
import sqlalchemy as sa

revision = "043"
down_revision = "042"
branch_labels = None
depends_on = None

KEY = "nav.collegesMenu"


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def upgrade() -> None:
    conn = op.get_bind()
    flagged = []
    for row in conn.execute(sa.text("SELECT id, slug, data FROM collections")).fetchall():
        data = _as_dict(row.data)
        placements = data.get("placements") or {}
        nav = placements.pop("nav", None)
        if nav is None:
            continue
        flagged.append((nav.get("order", 0), row.slug))
        data["placements"] = placements
        conn.execute(sa.text("UPDATE collections SET data = CAST(:d AS jsonb) WHERE id = :i"), {"d": json.dumps(data), "i": row.id})

    if not flagged:
        return
    existing = conn.execute(sa.text("SELECT data FROM site_content WHERE key = :k"), {"k": KEY}).scalar()
    config = _as_dict(existing) if existing else {}
    config.setdefault("order", [])
    config.setdefault("groups", {})
    custom = config.setdefault("custom", [])
    custom.append({"id": "custom-featured", "label": "Featured Collections", "collections": [slug for _, slug in sorted(flagged)]})
    conn.execute(
        sa.text("INSERT INTO site_content (key, data) VALUES (:k, CAST(:d AS jsonb)) ON CONFLICT (key) DO UPDATE SET data = CAST(:d AS jsonb)"),
        {"k": KEY, "d": json.dumps(config)},
    )


def downgrade() -> None:
    # The placements are not rebuilt: the categories in the navigation settings are the record now.
    pass
