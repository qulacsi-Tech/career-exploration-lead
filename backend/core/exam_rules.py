"""Rules for the exam fields an editor types, shared by the create and update bodies.

Dates are kept as short text ("26 Mar 2027") because the public site shows them that way, so they are
checked here rather than by the database. Every message is a sentence an editor can act on.
"""

import re
from datetime import date
from typing import Optional

_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
_DATE_RE = re.compile(r"^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$")
_TAG_RE = re.compile(r"<[^>]*>")
_FEE_RE = re.compile(r"^(?:free\b|nil\b|no fee\b|[₹$€£]|rs\.?\s*\d|inr\s*\d|usd\s*\d|\d)", re.IGNORECASE)

MIN_YEAR, MAX_YEAR = 2000, 2100


def parse_date(text: Optional[str]) -> Optional[date]:
    """The calendar date for "26 Mar 2027", or None when the text is not an exact, real date."""
    m = _DATE_RE.match((text or "").strip())
    if not m or m.group(2).lower() not in _MONTHS:
        return None
    try:
        return date(int(m.group(3)), _MONTHS.index(m.group(2).lower()) + 1, int(m.group(1)))
    except ValueError:
        return None


def check_date(value: Optional[str], label: str = "Date") -> Optional[str]:
    """Empty is allowed. Otherwise an exact date like "26 Mar 2027" with a sensible year."""
    if value is None or value.strip() == "":
        return value
    parsed = parse_date(value)
    if parsed is None or value.strip() != f"{parsed.day} {_MONTHS[parsed.month - 1].capitalize()} {parsed.year}":
        raise ValueError(f"{label} must be a real date written like 26 Mar 2027.")
    if not MIN_YEAR <= parsed.year <= MAX_YEAR:
        raise ValueError(f"{label} must be between the years {MIN_YEAR} and {MAX_YEAR}.")
    return value.strip()


def check_fee(value: Optional[str]) -> Optional[str]:
    """Empty, or text that starts with an amount or says it is free, e.g. "₹1,000" or "₹100 (no fee for women)"."""
    if value is None or value.strip() == "":
        return value
    text = value.strip()
    if not _FEE_RE.match(text) or not re.search(r"\d|free|nil|no fee", text, re.IGNORECASE):
        raise ValueError("Application fee must start with an amount, e.g. ₹1,000, or say Free.")
    return text


def check_url(value: Optional[str], label: str = "Official site") -> Optional[str]:
    """Empty, or an http(s) address."""
    if value is None or value.strip() == "":
        return value
    text = value.strip()
    if not re.match(r"^https?://[^\s/$.?#][^\s]*\.[^\s]{2,}$", text, re.IGNORECASE):
        raise ValueError(f"{label} must be a full web address starting with http:// or https://.")
    return text


def plain_text(value: Optional[str], label: str) -> Optional[str]:
    """Plain-text fields hold no HTML: a value with a tag in it is refused."""
    if value is not None and _TAG_RE.search(value):
        raise ValueError(f"{label} cannot contain HTML tags such as <b> or <script>.")
    return value


def check_order(registration_closes: Optional[str], exam_date: Optional[str]) -> None:
    """Registration must close on or before the exam date (when both are exact dates)."""
    closes, exam = parse_date(registration_closes), parse_date(exam_date)
    if closes and exam and closes > exam:
        raise ValueError("Registration must close on or before the exam date.")


def data_issues(registration_closes: Optional[str], exam_date: Optional[str], fee: Optional[str]) -> list[str]:
    """What is wrong with values saved before these rules existed, for the admin list to flag."""
    out: list[str] = []
    for label, value in (("Registration closes", registration_closes), ("Exam date", exam_date)):
        if value and value.strip():
            try:
                check_date(value, label)
            except ValueError as err:
                out.append(str(err))
    if fee and fee.strip():
        try:
            check_fee(fee)
        except ValueError as err:
            out.append(str(err))
    try:
        check_order(registration_closes, exam_date)
    except ValueError as err:
        out.append(str(err))
    return out
