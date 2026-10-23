"""List the colleges that look like QA or test records, and archive them with --apply.

    python -m scripts.archive_test_colleges            # only lists what it would archive
    python -m scripts.archive_test_colleges --apply    # archives them (reversible: Restore in the admin)

A college is picked when its name or city has "QA" as a word, "test" or "demo" in it, markup, or SQL
that someone typed to try the form. Read the list before you apply it: the match is a guess, and
nothing is deleted either way.
"""

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, update  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from models.college import College  # noqa: E402

LOOKS_LIKE_TEST = re.compile(r"\bqa\b|qa-|test|demo|<\s*script|drop\s+table|select\s+\*|numeric city|fakeexam", re.IGNORECASE)


async def main(apply: bool) -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(College.slug, College.name, College.city, College.status).order_by(College.name))).all()
        picked = [r for r in rows if r.status != "archived" and LOOKS_LIKE_TEST.search(f"{r.name} {r.city} {r.slug}")]
        for r in picked:
            print(f"{r.status:<10} {r.slug:<40} {r.name} ({r.city})")
        print(f"\n{len(picked)} of {len(rows)} colleges look like test records.")
        if not picked:
            return
        if not apply:
            print("Nothing changed. Run again with --apply to archive them.")
            return
        await db.execute(update(College).where(College.slug.in_([r.slug for r in picked])).values(status="archived"))
        await db.commit()
        print("Archived. Restore any of them from the admin colleges list.")


if __name__ == "__main__":
    asyncio.run(main("--apply" in sys.argv))
