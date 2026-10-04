"""Aggregated home-page schema — one response that populates the entire home page."""

from typing import Any, Dict, List
from pydantic import BaseModel, ConfigDict

from schemas.college import CollegeListSchema
from schemas.exam import ExamSchema
from schemas.location import LocationSchema
from schemas.article import ArticleListSchema
from schemas.program import ProgramSchema


class StreamCountSchema(BaseModel):
    slug: str
    name: str
    count: int

    model_config = ConfigDict(populate_by_name=True)


class CareerPanelLinkSchema(BaseModel):
    label: str
    href: str

    model_config = ConfigDict(populate_by_name=True)


class CareerPanelSchema(BaseModel):
    title: str
    viewAllHref: str
    links: List[CareerPanelLinkSchema]

    model_config = ConfigDict(populate_by_name=True)


class DataHighlightLinkSchema(BaseModel):
    label: str
    href: str

    model_config = ConfigDict(populate_by_name=True)


class DataHighlightSchema(BaseModel):
    slug: str
    title: str
    description: str
    links: List[DataHighlightLinkSchema]

    model_config = ConfigDict(populate_by_name=True)


class RecommendedUniversitySchema(BaseModel):
    slug: str
    name: str
    city: str
    state: str

    model_config = ConfigDict(populate_by_name=True)


class HeroCopySchema(BaseModel):
    headline: str = "Find Colleges, Courses & Exams That Are Best For You"
    subheadline: str = "Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts."
    searchPlaceholder: str = "Search by college, course or exam"
    searchButton: str = "Search"

    model_config = ConfigDict(populate_by_name=True)


class SectionCopySchema(BaseModel):
    eyebrow: str = ""
    heading: str
    accent: str = ""
    subheading: str = ""

    model_config = ConfigDict(populate_by_name=True)


class HomeCopySchema(BaseModel):
    hero: HeroCopySchema = HeroCopySchema()
    locations: SectionCopySchema = SectionCopySchema(eyebrow="Destination hubs", heading="Where Ambition Meets", accent="Opportunity")
    streams: SectionCopySchema = SectionCopySchema(heading="Chart Your Discipline.", accent="Shape Your Tomorrow.", subheading="Pick a stream to see its colleges, entrance exams, fees and placement records.")

    model_config = ConfigDict(populate_by_name=True)


class HomeDataSchema(BaseModel):
    homeCopy: HomeCopySchema = HomeCopySchema()
    featuredColleges: List[CollegeListSchema]
    featuredExams: List[ExamSchema]
    locations: List[LocationSchema]
    articles: List[ArticleListSchema]
    recommendedPrograms: List[ProgramSchema]
    careerPanels: List[CareerPanelSchema]
    recommendedUniversities: List[RecommendedUniversitySchema]
    dataHighlights: List[DataHighlightSchema]
    streams: List[StreamCountSchema]

    model_config = ConfigDict(populate_by_name=True)
