"""Aggregated home-page schema — one response that populates the entire home page."""

from typing import Any, Dict, List
from pydantic import BaseModel, ConfigDict

from schemas.college import CollegeListSchema
from schemas.exam import ExamSchema
from schemas.location import HomeLocationSchema, LocationSchema
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


class HomeFieldSchema(BaseModel):
    """One disc in the homepage Fields grid."""

    slug: str
    name: str
    icon: str
    tagline: str = ""
    badge: str = ""
    avgCtc: str = ""

    model_config = ConfigDict(populate_by_name=True)


class HeroCopySchema(BaseModel):
    """The search box under the hero slides. The slides themselves are `heroItems`."""

    searchPlaceholder: str = "Search by college, course or exam"
    searchButton: str = "Search"

    model_config = ConfigDict(populate_by_name=True)


class HeroItemSchema(BaseModel):
    """One hero slide."""

    id: str
    headline: str
    subheadline: str
    image: str = ""
    imageAlt: str = ""

    model_config = ConfigDict(populate_by_name=True)


class SectionCopySchema(BaseModel):
    eyebrow: str = ""
    heading: str
    accent: str = ""
    subheading: str = ""

    model_config = ConfigDict(populate_by_name=True)


class StoryCopySchema(BaseModel):
    """Heading and labels for a rotating-card section (recommended programmes or colleges)."""

    heading: str = "Recommended"
    accent: str = "Colleges"
    # The small line above each card's headline. Programmes only.
    itemEyebrow: str = ""
    # The line under each card's headline. Colleges only.
    itemSubline: str = ""
    buttonLabel: str = ""

    model_config = ConfigDict(populate_by_name=True)


class LocationCardCopySchema(BaseModel):
    """The fixed labels on each location card."""

    institutionsLabel: str = "Ranked Institutions"
    ctcLabel: str = "Average CTC"
    # Heading over the sliding course fees.
    coursesLabel: str = "Courses & fees"
    buttonLabel: str = "Explore Colleges"

    model_config = ConfigDict(populate_by_name=True)


class CollegeCardCopySchema(BaseModel):
    """The fixed words on the Top Colleges cards and their View all button."""

    buttonLabel: str = "Courses & fees"
    viewAllLabel: str = "View All"

    model_config = ConfigDict(populate_by_name=True)


class ExamCardCopySchema(BaseModel):
    """The fixed words on the Top Exams cards and their View all button."""

    cutoffLabel: str = "Cutoff"
    answerKeyLabel: str = "Answer key"
    buttonLabel: str = "Read more"
    viewAllLabel: str = "View All"

    model_config = ConfigDict(populate_by_name=True)


class PromoBannerSchema(BaseModel):
    """The brand-coloured banner under the Explore Careers panels."""

    heading: str = "Browse through our list of popular programs and universities"
    buttonLabel: str = "Discover More"
    buttonHref: str = "/colleges"
    image: str = ""
    imageAlt: str = ""

    model_config = ConfigDict(populate_by_name=True)


class HomeCopySchema(BaseModel):
    hero: HeroCopySchema = HeroCopySchema()
    locations: SectionCopySchema = SectionCopySchema(eyebrow="Destination hubs", heading="Where Ambition Meets", accent="Opportunity")
    streams: SectionCopySchema = SectionCopySchema(heading="Chart Your Discipline.", accent="Shape Your Tomorrow.", subheading="Pick a stream to see its colleges, entrance exams, fees and placement records.")
    locationCard: LocationCardCopySchema = LocationCardCopySchema()
    collegeCard: CollegeCardCopySchema = CollegeCardCopySchema()
    examCard: ExamCardCopySchema = ExamCardCopySchema()
    topExams: SectionCopySchema = SectionCopySchema(heading="Top Exams", subheading="Exams Cherry Picked For You")
    programs: StoryCopySchema = StoryCopySchema(itemEyebrow="Online & On-campus", buttonLabel="Explore this program")
    careers: SectionCopySchema = SectionCopySchema(heading="Explore Careers", subheading="Explore your preferred streams to learn about the relevant colleges, exams and more!")
    promoBanner: PromoBannerSchema = PromoBannerSchema()
    universities: StoryCopySchema = StoryCopySchema(itemSubline="Accredited programs, verified placement records and open intakes.", buttonLabel="Know more")
    data: SectionCopySchema = SectionCopySchema(heading="Data", subheading="We simplify information for you on over 30,000 colleges, 500 exams and 500 courses across domains and regions all over India")
    articles: SectionCopySchema = SectionCopySchema(heading="Latest News &", accent="Updates")

    model_config = ConfigDict(populate_by_name=True)


class HomeDataSchema(BaseModel):
    homeCopy: HomeCopySchema = HomeCopySchema()
    featuredColleges: List[CollegeListSchema]
    featuredExams: List[ExamSchema]
    locations: List[LocationSchema]
    homeLocations: List[HomeLocationSchema] = []
    articles: List[ArticleListSchema]
    recommendedPrograms: List[ProgramSchema]
    careerPanels: List[CareerPanelSchema]
    recommendedUniversities: List[RecommendedUniversitySchema]
    dataHighlights: List[DataHighlightSchema]
    streams: List[StreamCountSchema]
    # The active hero slides, in order. One shows as a plain hero, several rotate.
    heroItems: List[HeroItemSchema] = []
    # The Fields grid, in the admin's order. Separate from `streams`, which lists real college streams.
    fields: List[HomeFieldSchema] = []

    model_config = ConfigDict(populate_by_name=True)
