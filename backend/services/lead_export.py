"""Leads as a CSV file, for the team and for college admins to open in a spreadsheet."""

import csv
import io
from datetime import datetime, timezone

from fastapi.responses import Response

from models.lead import Lead

# More than a spreadsheet is useful for, and a bound on one request's work and memory.
MAX_ROWS = 20_000

PLATFORM_COLUMNS = [
    ("Received (UTC)", lambda l: l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else ""),
    ("Name", lambda l: l.name),
    ("Phone", lambda l: l.phone),
    ("Email", lambda l: l.email or ""),
    ("College", lambda l: l.college_slug or ""),
    ("Programme", lambda l: l.program_name or ""),
    ("Type", lambda l: _v(l.type)),
    ("Status", lambda l: _v(l.status)),
    ("Stream", lambda l: l.stream or ""),
    ("City", lambda l: l.city or ""),
    ("Message", lambda l: l.message or ""),
    ("Came from", lambda l: l.source or ""),
    ("Agreed to be contacted", lambda l: "Yes" if l.consent else "No"),
    ("Asked again", lambda l: l.repeat_count or 0),
    ("Signed in", lambda l: "Yes" if l.user_id else "No"),
    ("Replies sent", lambda l: len(l.replies)),
    ("Reference", lambda l: f"TCP-{str(l.id)[:8].upper()}"),
]

# A college admin gets the same, minus how the person found the site.
COLLEGE_COLUMNS = [c for c in PLATFORM_COLUMNS if c[0] not in ("Came from",)]


def _v(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _safe(value) -> str:
    """
    A cell that starts with = + - @ (or a tab or return) is run as a formula by Excel and Sheets, so a
    stranger's "name" could read files or phone home when the team opens the export. A leading
    apostrophe makes the spreadsheet treat it as plain text.
    """
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def leads_csv_response(leads: list[Lead], *, for_college: bool) -> Response:
    columns = COLLEGE_COLUMNS if for_college else PLATFORM_COLUMNS
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([name for name, _ in columns])
    for lead in leads:
        writer.writerow([_safe(get(lead)) for _, get in columns])

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # The byte order mark makes Excel read the file as UTF-8, so names in any script show correctly.
    return Response(
        content="﻿" + out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="leads-{stamp}.csv"', "Cache-Control": "no-store"},
    )
