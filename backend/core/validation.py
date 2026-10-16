"""Validation helpers shared by the admin routers.

`validate_body` turns pydantic's developer-facing errors ("name: String should
have at least 2 characters") into a sentence an editor can act on. The format
checks for durations and fees live here too, so courses and programmes agree.
"""

import re
from typing import Optional

from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from core.exceptions import ValidationError

# Field names that read badly when split from camelCase.
LABELS = {
    "name": "Name",
    "fullName": "Full name",
    "universityName": "University name",
    "universitySlug": "University slug",
    "onlineDuration": "Online duration",
    "onlineFees": "Online fees",
    "onlineFeesNote": "Online fees note",
    "onCampusDuration": "On-campus duration",
    "onCampusFees": "On-campus fees",
    "averageFees": "Average fees",
    "examsAccepted": "Accepted exams",
    "collegeCount": "Colleges offering",
}

SLUG_HINT = "use lowercase letters, numbers and single hyphens, e.g. my-course"


def label(field: str) -> str:
    if field in LABELS:
        return LABELS[field]
    words = re.sub(r"(?<!^)(?=[A-Z])", " ", field).lower()
    return words[:1].upper() + words[1:]


def _message(err: dict) -> str:
    if not err["loc"]:
        # A rule across several fields (raised from a model validator).
        text = str(err["msg"]).removeprefix("Value error, ")
        return text[:1].upper() + text[1:]
    field = str(err["loc"][-1])
    name = label(field)
    kind = err["type"]
    ctx = err.get("ctx") or {}
    if kind == "missing":
        return f"{name} is required."
    if kind == "string_too_short":
        n = ctx.get("min_length", 1)
        return f"{name} is required." if n <= 1 else f"{name} must be at least {n} characters."
    if kind == "string_too_long":
        return f"{name} must be at most {ctx.get('max_length')} characters."
    if kind == "string_pattern_mismatch":
        return f"{name}: {SLUG_HINT}." if field.lower().endswith("slug") else f"{name} is not in the expected format."
    if kind in ("literal_error", "enum"):
        return f"{name}: choose one of the listed options."
    if kind in ("greater_than_equal", "less_than_equal", "greater_than", "less_than"):
        return f"{name} is out of range."
    if kind in ("int_parsing", "int_type", "float_parsing"):
        return f"{name} must be a number."
    if kind == "value_error":
        # Our own validators raise ValueError("...") — pydantic prefixes "Value error, ".
        return f"{name}: " + str(err["msg"]).removeprefix("Value error, ")
    return f"{name} is not valid."


def validate_body(model: type[BaseModel], raw: dict) -> BaseModel:
    try:
        return model.model_validate(raw)
    except PydanticValidationError as exc:
        raise ValidationError(_message(exc.errors()[0])) from exc


# ── Durations and fees ───────────────────────────────────────────────────────

_NUM = r"\d+(?:\.\d+)?"
_DURATION = re.compile(rf"^({_NUM})(?:\s*-\s*({_NUM}))?\s*(?:months?|years?)(?:\s*\(.*\))?$", re.I)
_AMOUNT = r"\d[\d,]*(?:\.\d+)?\s*(?:cr|crore|crores|lakh|lakhs|l|k)?"
_CURRENCY = r"(?:inr|usd|eur|gbp|rs\.?|₹|\$|€|£)?\s*"
_FEES = re.compile(rf"^{_CURRENCY}({_AMOUNT})(?:\s*-\s*{_CURRENCY}({_AMOUNT}))?(?:\s*\(.*\))?$", re.I)
_UNIT = {"": 1, "k": 1e3, "l": 1e5, "lakh": 1e5, "lakhs": 1e5, "cr": 1e7, "crore": 1e7, "crores": 1e7}


def check_duration(value: Optional[str]) -> Optional[str]:
    """A positive number with a unit: "4 Years", "5.5 Years", "24 Months", "12-18 months"."""
    if value is None:
        return value
    text = value.strip()
    if not text:
        return text
    match = _DURATION.match(text)
    if not match or any(float(n) <= 0 for n in match.groups() if n):
        raise ValueError('enter a positive number with a unit, e.g. "4 Years" or "24 Months".')
    if match.group(2) and float(match.group(1)) > float(match.group(2)):
        raise ValueError("the first number must not be larger than the second.")
    return text


def _scaled(amount: str, fallback_unit: str = "") -> tuple[float, str]:
    m = re.match(r"^([\d,]+(?:\.\d+)?)\s*([a-z]*)$", amount.strip(), re.I)
    number = float(m.group(1).replace(",", ""))
    unit = (m.group(2) or "").lower()
    return number * _UNIT.get(unit or fallback_unit, 1), unit


def check_fees(value: Optional[str]) -> Optional[str]:
    """An amount or a range: "₹4L - 20L", "INR 3,50,000 (approx.)", "USD 17,000". Positive, min <= max."""
    if value is None:
        return value
    text = value.strip()
    if not text:
        return text
    match = _FEES.match(text)
    if not match:
        raise ValueError('enter an amount like "₹4L - 20L" or "INR 3,50,000".')
    low_text, high_text = match.group(1), match.group(2)
    # "4-20L": the first figure shares the second one's unit.
    _, high_unit = _scaled(high_text) if high_text else (0, "")
    low, low_unit = _scaled(low_text, high_unit if high_text else "")
    if low <= 0:
        raise ValueError("the amount must be greater than zero.")
    if high_text:
        high, _ = _scaled(high_text)
        if high <= 0:
            raise ValueError("the amount must be greater than zero.")
        if low > high:
            raise ValueError("the minimum must not be larger than the maximum.")
    return text
