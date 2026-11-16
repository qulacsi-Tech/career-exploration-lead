from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict

from schemas.article import ArticleSection


class ExamFaqSchema(BaseModel):
    question: str
    answer: str


class ExamSchema(BaseModel):
    slug: str
    # The number after the slug in the page's address.
    publicId: int = 0
    name: str
    # Where space is tight. Empty: the full name.
    shortName: str = ""
    conductingBody: str
    level: str
    description: str
    registrationCloses: Optional[str] = None
    examDate: Optional[str] = None
    # Extended detail fields
    mode: Optional[str] = None
    frequency: Optional[str] = None
    applicationFee: Optional[str] = None
    officialSite: Optional[str] = None
    durationMinutes: Optional[int] = None
    sections: Optional[List[str]] = None
    # The category the exam is listed under. Empty: none.
    stream: str = ""
    # Detail page content. Empty: the page leaves the section out.
    eligibility: str = ""
    syllabus: str = ""
    faqs: List[ExamFaqSchema] = []
    # Extra page content built with the section editor (same blocks as a news article).
    contentSections: List[ArticleSection] = []
    # The page's headings and short lines set in the admin, by key. Missing: the usual wording.
    pageText: Dict[str, str] = {}
    # College slug -> place among the colleges listed on the exam's page (1 first).
    collegePriority: Dict[str, int] = {}
    # Card photo. Empty: the card shows no photo.
    image: str = ""
    # The badge on the card: Upcoming, Live, Expired or any words. Empty: no badge.
    statusLabel: str = ""
    # SEO set in the admin (metaTitle, canonical, metaDescription, ogImage, schemaType, robots). Empty: site defaults.
    seo: Dict[str, str] = {}
    # True when archived: hidden from the public site (only the admin list returns these).
    archived: bool = False
    # Problems found in the saved dates and fee, so the admin list can flag them. Empty: none.
    dataIssues: List[str] = []

    model_config = ConfigDict(populate_by_name=True)
