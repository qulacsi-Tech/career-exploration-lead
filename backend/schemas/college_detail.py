"""The editor-written parts of a college page, and the checks they pass on the way in.

A college page is more than the columns on the college row: the masthead's short title and
locality, the faculty roster, the Q&A, the gallery and videos, news and alerts, the written
sections (Admissions, Infrastructure, Scholarships) and the SEO text. These are stored together
as one JSON document on the college (`colleges.detail`) and read back by the public page.

Everything here is validated, in the admin API before it is stored, and the same models shape
what the public API returns, so a record that was saved is a record that renders.
"""

import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from core.college_rules import NEWS_YEAR_MIN, check_not_future, check_ratio

DATE = r"^\d{4}-\d{2}-\d{2}$"
SITE_OR_HTTPS = r"^(/[^\s]*|https://[^\s]+)$"
HTTPS = r"^https://[^\s]+$"

# The written sections a college page has, by the tab-template slug they are stored under.
TAB_SLUGS = ("admission-process", "hostel-facilities", "scholarships")
MAX_TAB_BYTES = 60_000
_USABLE_IMAGE = re.compile(r"^(/api/uploads/|/images/|https://)\S+$")


def _without_broken_images(node: dict) -> dict:
    """A picture whose address cannot load (a relative path, a data URI) is dropped, not stored as an empty figure."""
    children = node.get("content")
    if not isinstance(children, list):
        return node
    kept = [
        _without_broken_images(c)
        for c in children
        if isinstance(c, dict) and not (c.get("type") == "image" and not _USABLE_IMAGE.match(str((c.get("attrs") or {}).get("src", ""))))
    ]
    return {**node, "content": kept}


def photo_path(value: str) -> str:
    """Empty, an upload, or a photo shipped with the site. Never an external address."""
    value = (value or "").strip()
    if value and (not (value.startswith("/api/uploads/") or value.startswith("/images/")) or ".." in value):
        raise ValueError("must be an image uploaded through the admin")
    return value


class FacultyMember(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    designation: str = Field(default="", max_length=120)
    department: str = Field(default="", max_length=120)
    qualification: str = Field(default="", max_length=160)
    model_config = ConfigDict(extra="forbid")


class Faculty(BaseModel):
    count: Optional[int] = Field(default=None, ge=0, le=100000)
    # "15:1"
    studentRatio: str = Field(default="", max_length=20)
    phdPercent: Optional[int] = Field(default=None, ge=0, le=100)
    members: list[FacultyMember] = Field(default_factory=list, max_length=60)
    model_config = ConfigDict(extra="forbid")

    _ratio = field_validator("studentRatio")(check_ratio)


# The questions the site writes itself from a college's record, by key (see lib/college-insights on the site).
AUTO_FAQ_KEYS = ("courses", "exams", "placements", "cutoffs", "approved", "reviews")


class Faq(BaseModel):
    """A question and answer, or an adjustment to one the site writes itself.

    An entry the editor wrote has a question and an answer. An entry with `auto` set (a key from AUTO_FAQ_KEYS)
    adjusts the question the site generates under that key: not `active` hides it, and a question and answer
    replace the generated wording (both empty: the generated text stands).
    """

    question: str = Field(default="", max_length=300)
    answer: str = Field(default="", max_length=2000)
    # False: kept, but not shown.
    active: bool = True
    auto: str = Field(default="", max_length=20)
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def _shape(self):
        if self.auto:
            if self.auto not in AUTO_FAQ_KEYS:
                raise ValueError("auto: not a generated question")
            if bool(self.question.strip()) != bool(self.answer.strip()):
                raise ValueError("a replaced generated question needs both the question and the answer")
        elif len(self.question.strip()) < 3 or not self.answer.strip():
            raise ValueError("write the question (at least 3 characters) and the answer")
        return self


class Seo(BaseModel):
    metaTitle: str = Field(default="", max_length=70)
    metaDescription: str = Field(default="", max_length=170)
    model_config = ConfigDict(extra="forbid")


class GalleryItem(BaseModel):
    src: str = Field(min_length=1, max_length=200)
    # Required: a figure with no description is unusable to a screen reader and to image search.
    alt: str = Field(min_length=3, max_length=200)
    name: str = Field(default="", max_length=120)
    highlight: bool = False
    model_config = ConfigDict(extra="forbid")

    _src = field_validator("src")(photo_path)


class VideoItem(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    provider: Literal["youtube", "vimeo"]
    videoId: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    model_config = ConfigDict(extra="forbid")


class MediaItem(BaseModel):
    """Press coverage: where the college was written about."""

    title: str = Field(min_length=3, max_length=200)
    publication: str = Field(default="", max_length=120)
    date: str = Field(default="", pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    link: str = Field(default="", max_length=300, pattern=r"^(https://[^\s]+)?$")
    model_config = ConfigDict(extra="forbid")

    @field_validator("date")
    @classmethod
    def _date(cls, value: str) -> str:
        return check_not_future(value, "The date", NEWS_YEAR_MIN)


class AlertItem(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    date: str = Field(pattern=DATE)
    kind: Literal["Admission", "Exam", "Result", "Notice"] = "Notice"
    isUrgent: bool = False
    link: str = Field(default="", max_length=300, pattern=r"^(/[^\s]*|https://[^\s]+)?$")
    model_config = ConfigDict(extra="forbid")

    @field_validator("date")
    @classmethod
    def _date(cls, value: str) -> str:
        return check_not_future(value, "The date", NEWS_YEAR_MIN)


class ArticleItem(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    date: str = Field(pattern=DATE)
    # Empty: no author is shown.
    author: str = Field(default="", max_length=120)
    summary: str = Field(default="", max_length=600)
    body: str = Field(default="", max_length=20000)
    model_config = ConfigDict(extra="forbid")

    @field_validator("date")
    @classmethod
    def _date(cls, value: str) -> str:
        return check_not_future(value, "The date", NEWS_YEAR_MIN)


TAB_ICONS = ("grad", "award", "building", "book", "star", "trophy", "users", "target", "sparkles", "shield")


class TabHeader(BaseModel):
    """The banner at the top of a written section: the small label, the heading, and its icon. Empty means the default."""

    label: str = Field(default="", max_length=40)
    heading: str = Field(default="", max_length=140)
    icon: str = Field(default="", max_length=20)
    model_config = ConfigDict(extra="forbid")

    @field_validator("label", "heading")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: str) -> str:
        if value and value not in TAB_ICONS:
            raise ValueError("choose an icon from the list")
        return value


class CollegeDetail(BaseModel):
    """Everything an editor writes for a college page beyond the college row itself."""

    # "BIMS Bengaluru": the masthead title. Empty: initials and city.
    shortName: str = Field(default="", max_length=80)
    # After the short name in the page heading: "Courses, Fees, Admission 2027". Empty: a default.
    tagline: str = Field(default="", max_length=160)
    # The street or area before the city.
    locality: str = Field(default="", max_length=120)
    logo: str = Field(default="", max_length=200)
    # A link to the brochure. Empty: the Brochure button opens the enquiry form.
    brochureUrl: str = Field(default="", max_length=300, pattern=r"^(/[^\s]*|https://[^\s]+)?$")
    faculty: Faculty = Field(default_factory=Faculty)
    faqs: list[Faq] = Field(default_factory=list, max_length=30)
    # Colleges pinned as similar. Empty: the nearest by stream and rank.
    similarSlugs: list[str] = Field(default_factory=list, max_length=8)
    seo: Seo = Field(default_factory=Seo)
    gallery: list[GalleryItem] = Field(default_factory=list, max_length=40)
    videos: list[VideoItem] = Field(default_factory=list, max_length=20)
    media: list[MediaItem] = Field(default_factory=list, max_length=20)
    alerts: list[AlertItem] = Field(default_factory=list, max_length=30)
    articles: list[ArticleItem] = Field(default_factory=list, max_length=20)
    # Rich-text documents for the written sections, by template slug.
    tabs: dict[str, dict] = Field(default_factory=dict)
    # The banner over each written section, by the same slugs. A section with none shows the default one.
    tabHeaders: dict[str, TabHeader] = Field(default_factory=dict)
    model_config = ConfigDict(extra="forbid")

    _logo = field_validator("logo")(photo_path)

    @field_validator("tabHeaders")
    @classmethod
    def _tab_headers(cls, value: dict) -> dict:
        for slug in value:
            if slug not in TAB_SLUGS:
                raise ValueError(f"'{slug}' is not a written section of a college page")
        return value

    @field_validator("tabs")
    @classmethod
    def _tabs(cls, value: dict) -> dict:
        import json

        for slug, doc in value.items():
            if slug not in TAB_SLUGS:
                raise ValueError(f"'{slug}' is not a written section of a college page")
            if doc.get("type") != "doc":
                raise ValueError(f"{slug}: not a document")
            if len(json.dumps(doc)) > MAX_TAB_BYTES:
                raise ValueError(f"{slug}: too long")
        return {slug: _without_broken_images(doc) for slug, doc in value.items()}

    @model_validator(mode="after")
    def _unique_similar(self):
        if len(set(self.similarSlugs)) != len(self.similarSlugs):
            raise ValueError("similarSlugs: a college appears more than once")
        return self

    @model_validator(mode="after")
    def _unique_questions(self):
        seen: set[str] = set()
        for faq in self.faqs:
            key = " ".join(faq.question.lower().split())
            if key in seen:
                raise ValueError(f"Q&A: the question '{faq.question.strip()}' is listed more than once.")
            seen.add(key)
        return self
