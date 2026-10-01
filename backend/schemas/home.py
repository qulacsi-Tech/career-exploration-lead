"""Aggregated home-page schema — one response that populates the entire home page."""

from typing import Any, Dict, List
from pydantic import BaseModel, ConfigDict

from schemas.college import CollegeListSchema
from schemas.exam import ExamSchema
from schemas.location import LocationSchema
from schemas.article import ArticleListSchema
from schemas.program import ProgramSchema


class StreamCountSchema(BaseModel):
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


class HomeDataSchema(BaseModel):
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
