"""Check the colleges in the database against the rules the API now enforces, and fix what is safe to fix.

    python -m scripts.repair_college_data                       # report only: nothing is changed
    python -m scripts.repair_college_data --apply               # also apply the safe repairs below
    python -m scripts.repair_college_data --apply --archive-duplicates

Safe repairs (made only with --apply, and each one is reversible or exact):
  * a negative or out-of-date programme count is set to the number of programmes the college lists
  * a state with a typo ("Karnatak") is set to the one state it clearly means
  * an exam name missing the space before its abbreviation ("Test(CAT)") gets it
  * colleges that look like QA or test records are archived (restore them in the admin)
  * with --archive-duplicates, the lesser copy of a college listed twice (same name, same city) is archived

Everything else is only reported, because it needs a person: ownership and stream that do not fit the
name, exams missing from the directory, fee ranges and tags the new rules would refuse, and so on.
Run it on the database you want to check; it reads DATABASE_URL like the API does.
"""

import asyncio
import difflib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402

from core import college_rules as rules  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402
from data.india_districts import INDIA_DISTRICTS  # noqa: E402
from models.college import College  # noqa: E402
from models.exam import Exam  # noqa: E402

LOOKS_LIKE_TEST = re.compile(r"\bqa\b|qa-|test|demo|<\s*script|drop\s+table|select\s+\*|numeric city|fakeexam", re.IGNORECASE)
MISSING_SPACE = re.compile(r"(\S)\(")


def refused(check, *args) -> str | None:
    try:
        check(*args)
    except ValueError as exc:
        return str(exc)
    return None


def suspicious_fit(c: College) -> list[str]:
    name = c.name.lower()
    out = []
    owner = c.ownership.value if hasattr(c.ownership, "value") else str(c.ownership)
    if owner == "Private" and re.search(r"\b(government|govt|iit|nit|iim|aiims)\b", name):
        out.append(f"{c.name}: ownership is {owner}")
    if owner == "Government" and re.search(r"\b(christ|manipal|amity|srm|symbiosis|bits)\b", name):
        out.append(f"{c.name}: ownership is {owner}")
    if c.stream == "Management" and re.search(r"engineering|technology|medical|pharma|\blaw\b", name):
        out.append(f"{c.name}: category is {c.stream}")
    if c.stream == "Engineering" and re.search(r"management|business|medical|pharma|\blaw\b", name):
        out.append(f"{c.name}: category is {c.stream}")
    return out


async def main(apply: bool, archive_duplicates: bool) -> None:
    async with AsyncSessionLocal() as db:
        colleges = (
            await db.execute(select(College).options(selectinload(College.courses), selectinload(College.cutoffs), selectinload(College.placements), selectinload(College.reviews)).order_by(College.name))
        ).scalars().unique().all()
        exams = (await db.execute(select(Exam))).scalars().all()
        table = rules.exam_lookup([(e.slug, e.name) for e in exams])

        fixes: list[str] = []
        report: dict[str, list[str]] = defaultdict(list)

        # 1. exam names: the space before "(ABBR)"
        for e in exams:
            fixed = MISSING_SPACE.sub(r"\1 (", e.name)
            if fixed != e.name:
                fixes.append(f"exam name '{e.name}' -> '{fixed}'")
                if apply:
                    e.name = fixed

        archived: set[str] = set()

        # 2. QA and test records
        for c in colleges:
            if c.status != "archived" and LOOKS_LIKE_TEST.search(f"{c.name} {c.city} {c.slug}"):
                fixes.append(f"archive test record: {c.slug} | {c.name} | {c.city}")
                archived.add(c.slug)
                if apply:
                    c.status = "archived"

        # 3. the same college listed twice
        groups: dict[tuple[str, str], list[College]] = defaultdict(list)
        for c in colleges:
            if c.slug not in archived and c.status != "archived":
                groups[(c.name.strip().lower(), c.city.strip().lower())].append(c)
        for lst in groups.values():
            if len(lst) > 1:
                lst.sort(key=lambda c: (-len(c.courses), c.created_at))
                keep, extra = lst[0], lst[1:]
                report["listed twice (same name and city)"].append(
                    f"{keep.name} / {keep.city}: keep {keep.slug} ({len(keep.courses)} programmes); also " + ", ".join(f"{x.slug} ({len(x.courses)})" for x in extra)
                )
                if archive_duplicates:
                    for x in extra:
                        fixes.append(f"archive duplicate: {x.slug} (keeping {keep.slug})")
                        archived.add(x.slug)
                        if apply:
                            x.status = "archived"

        for c in colleges:
            # 4. programme count
            real = len(c.courses)
            if c.courses_offered != real:
                fixes.append(f"programme count: {c.slug} {c.courses_offered} -> {real}")
                if apply:
                    c.courses_offered = real

            # 5. state typo
            if c.state not in INDIA_DISTRICTS:
                close = difflib.get_close_matches(c.state, list(INDIA_DISTRICTS), n=2, cutoff=0.8)
                if len(close) == 1:
                    fixes.append(f"state: {c.slug} '{c.state}' -> '{close[0]}'")
                    if apply:
                        c.state = close[0]
                else:
                    report["state not in the list (fix by hand)"].append(f"{c.slug}: '{c.state}'")
            elif "," in c.city:
                report["city looks like 'city, state' (fix by hand)"].append(f"{c.slug}: '{c.city}'")

            # reported only
            if (msg := refused(rules.check_name, c.name, "name")):
                report["name the new rules refuse"].append(f"{c.slug}: {c.name!r}")
            if c.established is not None and refused(rules.check_year_established, c.established):
                report["year established out of range"].append(f"{c.slug}: {c.established}")
            if c.fees_range and (msg := refused(rules.check_fee_range, c.fees_range)):
                report["fee range the new rules refuse"].append(f"{c.slug}: {c.fees_range!r} ({msg})")
            for t in list(c.tags or []) + list(c.approvals or []):
                if len(t) > rules.TAG_MAX_CHARS:
                    report["tag or approval over 30 characters"].append(f"{c.slug}: {t[:60]!r}")
            names = list(c.exams_accepted or []) + [e for x in c.courses for e in (x.exams or [])] + [k.exam for k in c.cutoffs]
            for e in sorted({n.strip() for n in names if n and n.strip().lower() not in table}):
                report["exam not in the Exams directory (add it there)"].append(f"{c.slug}: {e}")
            for x in c.courses:
                if (msg := refused(rules.check_duration, x.duration)):
                    report["programme duration the new rules refuse"].append(f"{c.slug} / {x.name}: {x.duration!r}")
                if (msg := refused(rules.check_amount, x.fees, "fees")):
                    report["programme fee below zero"].append(f"{c.slug} / {x.name}: {x.fees!r}")
            for p in c.placements:
                if (msg := refused(rules.check_packages, p.average_package or "", p.median_package or "", p.highest_package or "")):
                    report["placement: highest below average or median"].append(f"{c.slug} {p.year}: {msg}")
            for v in c.reviews:
                if refused(rules.check_batch, v.batch):
                    report["review batch the new rules refuse"].append(f"{c.slug}: {v.batch!r}")
            for line in suspicious_fit(c):
                report["ownership or category does not fit the name (check against an official source)"].append(f"{c.slug}: {line}")

        print(f"{len(colleges)} colleges, {len(exams)} exams in the directory. Statuses: {dict(Counter(c.status for c in colleges))}\n")
        print(f"== Repairs {'APPLIED' if apply else 'that --apply would make'} ({len(fixes)}) ==")
        for line in fixes or ["none"]:
            print("  -", line)
        print(f"\n== Needs a person ({sum(len(v) for v in report.values())}) ==")
        for kind, lines in sorted(report.items()):
            print(f"\n{kind} ({len(lines)})")
            for line in lines[:30]:
                print("  -", line)
            if len(lines) > 30:
                print(f"  ... and {len(lines) - 30} more")
        if not report:
            print("  none")

        if apply:
            await db.commit()
            print("\nSaved.")
        else:
            await db.rollback()
            print("\nNothing was changed. Run again with --apply to make the repairs above.")


if __name__ == "__main__":
    asyncio.run(main("--apply" in sys.argv, "--archive-duplicates" in sys.argv))
