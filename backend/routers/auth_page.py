"""The words and pictures of the log in and sign up pages. The public read is open; the write needs ADMIN.

Each page has its own copy (headings, field labels, button text, the line under the form) and its own
picture panel (a picture, a headline and a sentence over it). Anything the admin has not set shows the
default below, which is what the pages said before they were editable, so nothing changes until an admin
saves. The form itself (fields, validation, Google sign-in) is not editable: only what it says.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError, field_validator
from sqlalchemy import select

from core.dependencies import AdminPayload, DbSession
from core.exceptions import ValidationError
from models.site_content import SiteContent
from schemas.common import SuccessResponse

Page = Literal["login", "signup"]

public_router = APIRouter(prefix="/auth-page", tags=["auth"])
router = APIRouter(prefix="/admin/auth-page", tags=["admin"])

KEY = "auth.page"


class PageCopy(BaseModel):
    heading: str = Field(min_length=1, max_length=80)
    subheading: str = Field(default="", max_length=200)
    # Login only (the signup form's labels are fixed): the two fields and the tick under them.
    emailLabel: str = Field(default="Email", max_length=40)
    emailPlaceholder: str = Field(default="", max_length=60)
    passwordLabel: str = Field(default="Password", max_length=40)
    rememberLabel: str = Field(default="", max_length=60)
    submitLabel: str = Field(min_length=1, max_length=40)
    dividerText: str = Field(default="or", max_length=20)
    # "New here?" + "Create an account", linking to the other page.
    switchText: str = Field(default="", max_length=80)
    switchLink: str = Field(default="", max_length=60)
    # The picture panel.
    image: str = Field(default="", max_length=200)
    imageAlt: str = Field(default="", max_length=140)
    panelTitle: str = Field(default="", max_length=100)
    panelText: str = Field(default="", max_length=240)
    # Short lines shown as small cards on the panel (up to four).
    highlights: list[str] = Field(default_factory=list, max_length=4)
    model_config = ConfigDict(extra="forbid")

    @field_validator("heading", "subheading", "emailLabel", "emailPlaceholder", "passwordLabel", "rememberLabel", "submitLabel", "dividerText", "switchText", "switchLink", "imageAlt", "panelTitle", "panelText")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("highlights")
    @classmethod
    def _highlights(cls, value: list[str]) -> list[str]:
        lines = [" ".join(v.split()) for v in value]
        if any(len(line) > 60 for line in lines):
            raise ValueError("each line is at most 60 characters")
        return [line for line in lines if line]

    @field_validator("image")
    @classmethod
    def _upload_path(cls, value: str) -> str:
        """Empty, or a path to one of our own uploads. Never an external address."""
        value = value.strip()
        if value and not (value.startswith("/api/uploads/") and ".." not in value):
            raise ValueError("must be an image uploaded through the admin")
        return value


DEFAULTS: dict[str, dict] = {
    "login": {
        "heading": "Log in",
        "subheading": "Save colleges, track applications and pick up where you left off.",
        "emailLabel": "Email",
        "emailPlaceholder": "you@example.com",
        "passwordLabel": "Password",
        "rememberLabel": "Keep me signed in",
        "submitLabel": "Log in",
        "dividerText": "or",
        "switchText": "New here?",
        "switchLink": "Create an account",
        "image": "",
        "imageAlt": "",
        "panelTitle": "Your shortlist, in one place",
        "panelText": "Compare colleges, track the exams you are preparing for and pick up exactly where you left off.",
        "highlights": ["Shortlist and compare colleges", "Fees, placements and cut-offs side by side", "Exam dates and deadlines in one place"],
    },
    "signup": {
        "heading": "Create your account",
        "subheading": "Shortlist colleges, save comparisons and pick up where you left off.",
        "emailLabel": "Email",
        "emailPlaceholder": "you@example.com",
        "passwordLabel": "Password",
        "rememberLabel": "",
        "submitLabel": "Create account",
        "dividerText": "or",
        "switchText": "Already have an account?",
        "switchLink": "Log in",
        "image": "",
        "imageAlt": "",
        "panelTitle": "Start your college search",
        "panelText": "Free to join. Save colleges, compare fees and placements side by side, and hear about exams and deadlines.",
        "highlights": ["Free to join", "Save colleges you like", "Get exam alerts and counselling offers"],
    },
}


async def _row(db):
    return (await db.execute(select(SiteContent).where(SiteContent.key == KEY))).scalar_one_or_none()


async def _current(db) -> dict:
    """Both pages: what was saved over the defaults, field by field. Never fails."""
    saved = (await _row(db))
    data = saved.data if saved is not None and isinstance(saved.data, dict) else {}
    out = {}
    for page, defaults in DEFAULTS.items():
        mine = data.get(page) if isinstance(data.get(page), dict) else {}
        merged = {**defaults, **{k: v for k, v in mine.items() if k in defaults and isinstance(v, (str, list))}}
        try:
            out[page] = PageCopy.model_validate(merged).model_dump()
        except PydanticValidationError:
            out[page] = dict(defaults)
    return out


@public_router.get("", response_model=SuccessResponse[dict])
async def get_auth_page(db: DbSession):
    return SuccessResponse[dict](data=await _current(db))


@router.get("", response_model=SuccessResponse[dict])
async def admin_get_auth_page(_admin: AdminPayload, db: DbSession):
    return SuccessResponse[dict](data={**await _current(db), "defaults": DEFAULTS})


@router.put("/{page}", response_model=SuccessResponse[dict])
async def admin_put_auth_page(page: Page, _admin: AdminPayload, db: DbSession, body: dict):
    try:
        value = PageCopy.model_validate(body).model_dump()
    except PydanticValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"])
        raise ValidationError(f"{field}: {first['msg']}") from exc

    row = await _row(db)
    merged = {**(await _current(db)), page: value}
    if row is None:
        db.add(SiteContent(key=KEY, data=merged))
    else:
        row.data = merged
    await db.commit()
    return SuccessResponse[dict](data={"message": "Saved."})


@router.delete("/{page}", response_model=SuccessResponse[dict])
async def admin_reset_auth_page(page: Page, _admin: AdminPayload, db: DbSession):
    """Back to what the page said before it was editable."""
    row = await _row(db)
    if row is not None:
        merged = {**(await _current(db)), page: dict(DEFAULTS[page])}
        row.data = merged
        await db.commit()
    return SuccessResponse[dict](data={"message": "Back to the default."})
