"""The rules a college record has to pass, in one place.

Add College (routers/admin.py) and the editor (routers/admin_college_record.py) used to check
the same fields with different rules: one accepted a year the other refused. Both now call these,
and frontend/src/lib/college-rules.ts mirrors them so a mistake shows before Save. The server has
the last word.

Plain functions that raise ValueError with a message an editor can act on. No framework imports,
so they are easy to test.
"""

import re
import unicodedata
from datetime import date

YEAR_MIN = 1800
NEWS_YEAR_MIN = 2000
REVIEW_MIN_CHARS = 20
TAG_MAX_CHARS = 30

# Letters (with their marks) of any script, digits, spaces and the punctuation a real name uses.
_NAME_PUNCT = set(" .,&'’()/-:")
_DURATION = re.compile(r"^(\d{1,3}(?:\.\d)?)\s*(years?|months?)$", re.IGNORECASE)
_BATCH = re.compile(r"^\d{4}(?:\s*[-–—]\s*(?:\d{4}|\d{2}))?$")
_NUMBER = re.compile(r"(-?\d+(?:\.\d+)?)\s*(cr|crore|lpa|lakh|l)?", re.IGNORECASE)
_RATIO = re.compile(r"^(?:[1-9]\d{0,2}\s*:\s*[1-9]\d{0,2})?$")
_UNIT_LAKH = {"": 1.0, "l": 1.0, "lpa": 1.0, "lakh": 1.0, "cr": 100.0, "crore": 100.0}


def check_name(value: str, label: str = "The name") -> str:
    """A name people read: real characters, no markup or code."""
    value = " ".join((value or "").split())
    if len(value) < 2:
        raise ValueError(f"{label} is required.")
    if not all(c in _NAME_PUNCT or unicodedata.category(c)[0] in "LMN" for c in value):
        raise ValueError(f"{label} can use letters, numbers, spaces and . , & ' ( ) / - : only.")
    return value


def check_year_established(value: int | None) -> int | None:
    if value is None:
        return value
    this_year = date.today().year
    if not YEAR_MIN <= value <= this_year:
        raise ValueError(f"The year established must be between {YEAR_MIN} and {this_year}.")
    return value


def money_in_lakh(text: str) -> list[float]:
    """The amounts in a text such as "₹4.2L - 9.6L" or "₹7 - 18 LPA", in lakh, in the order written.

    A number with no unit takes the unit that follows the range ("₹7 - 18 LPA"). A leading minus is kept
    so that a negative can be refused."""
    found = [(float(m.group(1)), (m.group(2) or "").lower()) for m in _NUMBER.finditer(text.replace(",", ""))]
    last_unit = next((u for _, u in reversed(found) if u), "")
    return [n * _UNIT_LAKH.get(u or last_unit, 1.0) for n, u in found]


def check_fee_range(value: str, label: str = "The fee range") -> str:
    value = (value or "").strip()
    if not value:
        return value
    amounts = money_in_lakh(value)
    if any(a < 0 for a in amounts):
        raise ValueError(f"{label} cannot be negative.")
    if len(amounts) == 1 and re.search(r"[-–—](\s|$)", value):
        raise ValueError("Enter both the 'From' and the 'To' fee, or clear them.")
    if len(amounts) >= 2 and amounts[0] > amounts[1]:
        raise ValueError("The 'From' fee must be less than or equal to the 'To' fee.")
    return value


def check_amount(value: str, label: str) -> str:
    """One amount (a package, a fee): empty, or a number that is not negative."""
    value = (value or "").strip()
    if value and any(a < 0 for a in money_in_lakh(value)):
        raise ValueError(f"{label} must be 0 or more.")
    return value


def check_duration(value: str, label: str = "The duration") -> str:
    value = " ".join((value or "").split())
    if not _DURATION.match(value):
        raise ValueError(f"{label} must be a number of years or months, such as 2 Years or 18 Months.")
    return value


def check_packages(average: str, median: str, highest: str) -> None:
    """Compared in the same unit, so 10 LPA against 1 Cr is not a warning."""
    top = money_in_lakh(highest)
    if not top:
        return
    for other, name in ((money_in_lakh(average), "average"), (money_in_lakh(median), "median")):
        if other and top[0] < other[0]:
            raise ValueError(f"The highest package cannot be below the {name} package.")


def check_batch(value: str) -> str:
    value = (value or "").strip()
    if not _BATCH.match(value):
        raise ValueError("The batch must be a year or a range, such as 2021 or 2021-2025.")
    return value


def check_not_future(value: str, label: str, earliest_year: int | None = None) -> str:
    """An ISO date (YYYY-MM-DD) that is not in the future, and not absurdly old."""
    value = (value or "").strip()
    if not value:
        return value
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise ValueError(f"{label} is not a valid date.") from None
    if parsed > date.today():
        raise ValueError(f"{label} cannot be in the future.")
    if earliest_year is not None and parsed.year < earliest_year:
        raise ValueError(f"{label} cannot be before {earliest_year}.")
    return value


def check_ratio(value: str) -> str:
    value = (value or "").strip()
    if not _RATIO.match(value):
        raise ValueError("Write the ratio as 15:1, both numbers above zero.")
    return value


def check_score(value: str) -> str:
    """A cut-off: a percentile (0-100), a rank or marks. It needs a number; a percentile is capped."""
    value = (value or "").strip()
    numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", value.replace(",", ""))]
    if not numbers:
        raise ValueError("A cut-off needs a number, such as 98 percentile or rank 1200.")
    if re.search(r"percentile|%ile|\bpct\b", value, re.IGNORECASE) and numbers[0] > 100:
        raise ValueError("A percentile must be between 0 and 100.")
    return value


def check_short_text(value: str, label: str, maximum: int = TAG_MAX_CHARS) -> str:
    value = (value or "").strip()
    if len(value) > maximum:
        raise ValueError(f"{label} can be at most {maximum} characters.")
    return value


def exam_lookup(exams: list[tuple[str, str]]) -> dict[str, str]:
    """Names a person might write for an exam, mapped to the directory's own name.

    `exams` is (slug, name) pairs. "CAT", "cat" and "Common Admission Test (CAT)" all find the same exam."""
    table: dict[str, str] = {}
    for slug, name in exams:
        table[name.strip().lower()] = name
        table[slug.strip().lower()] = name
        m = re.search(r"\(([^)]+)\)\s*$", name)
        if m:
            table[m.group(1).strip().lower()] = name
    return table


def resolve_exams(values: list[str], table: dict[str, str], already: set[str], label: str) -> list[str]:
    """Each exam as the directory names it. One already on the record is kept as it is, so an older
    record is not refused for something it had before; anything new has to be in the directory."""
    out: list[str] = []
    for raw in values:
        text = raw.strip()
        if not text:
            continue
        if text.lower() in already:
            out.append(table.get(text.lower(), text))
            continue
        found = table.get(text.lower())
        if found is None:
            raise ValueError(f"{label}: '{text}' is not an exam in the directory.")
        out.append(found)
    return list(dict.fromkeys(out))
