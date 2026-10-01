"""Home service — assembles the single aggregated home-page response."""

from sqlalchemy.ext.asyncio import AsyncSession

from schemas.home import (
    CareerPanelLinkSchema,
    CareerPanelSchema,
    DataHighlightLinkSchema,
    DataHighlightSchema,
    HomeDataSchema,
    RecommendedUniversitySchema,
    StreamCountSchema,
)
from services.article import ArticleService
from services.college import CollegeService
from services.exam import ExamService
from services.location import LocationService
from services.program import ProgramService

# These panels are CMS-managed in Phase 2; for now they are defined as constants
# that match the mock-data.ts careerPanels exactly.
_CAREER_PANELS = [
    CareerPanelSchema(
        title="Featured Classes",
        viewAllHref="/classes",
        links=[
            CareerPanelLinkSchema(label="Paul University", href="/college/paul-university"),
            CareerPanelLinkSchema(label="K. R. Mangalam University", href="/college/kr-mangalam-university"),
            CareerPanelLinkSchema(label="Swarnam Startup and Innovation University", href="/college/swarnam-university"),
            CareerPanelLinkSchema(label="Science", href="/science/colleges"),
            CareerPanelLinkSchema(label="Arts", href="/arts/colleges"),
            CareerPanelLinkSchema(label="Commerce", href="/commerce/colleges"),
            CareerPanelLinkSchema(label="Pharmacy", href="/pharmacy/colleges"),
            CareerPanelLinkSchema(label="Law", href="/law/colleges"),
            CareerPanelLinkSchema(label="Paramedical", href="/paramedical/colleges"),
        ],
    ),
    CareerPanelSchema(
        title="Important Exams",
        viewAllHref="/exams",
        links=[
            CareerPanelLinkSchema(label="JEE Main", href="/exams/jee-main"),
            CareerPanelLinkSchema(label="JEE Advanced", href="/exams/jee-advanced"),
            CareerPanelLinkSchema(label="TS EAMCET", href="/exams/ts-eamcet"),
            CareerPanelLinkSchema(label="WBJEE", href="/exams/wbjee"),
            CareerPanelLinkSchema(label="VITEEE", href="/exams/viteee"),
        ],
    ),
    CareerPanelSchema(
        title="Top Cities",
        viewAllHref="/locations",
        links=[
            CareerPanelLinkSchema(label="Maharashtra", href="/location/maharashtra"),
            CareerPanelLinkSchema(label="Tamil Nadu", href="/location/tamil-nadu"),
            CareerPanelLinkSchema(label="Uttar Pradesh", href="/location/uttar-pradesh"),
            CareerPanelLinkSchema(label="Karnataka", href="/location/karnataka"),
            CareerPanelLinkSchema(label="Rajasthan", href="/location/rajasthan"),
        ],
    ),
    CareerPanelSchema(
        title="Related Courses",
        viewAllHref="/courses",
        links=[
            CareerPanelLinkSchema(label="B. Tech", href="/courses/b-tech"),
            CareerPanelLinkSchema(label="M. Tech", href="/courses/m-tech"),
            CareerPanelLinkSchema(label="Bachelor of Engineering", href="/courses/be"),
            CareerPanelLinkSchema(label="Civil Engineering", href="/courses/civil-engineering"),
            CareerPanelLinkSchema(label="Mechanical Engineering", href="/courses/mechanical-engineering"),
        ],
    ),
]

_DATA_HIGHLIGHTS = [
    DataHighlightSchema(
        slug="college-by-ranking",
        title="College By Ranking",
        description="Compare institutes side by side on NIRF rank, accreditation and placement record before you shortlist.",
        links=[
            DataHighlightLinkSchema(label="Top Engineering Colleges", href="/engineering/colleges"),
            DataHighlightLinkSchema(label="Top Medicine Colleges", href="/medical/colleges"),
            DataHighlightLinkSchema(label="Top Law Colleges", href="/law/colleges"),
            DataHighlightLinkSchema(label="see more", href="/colleges"),
        ],
    ),
    DataHighlightSchema(
        slug="exam",
        title="Exam",
        description="Track registration windows, exam dates, cutoffs and answer keys for every entrance test in one place.",
        links=[
            DataHighlightLinkSchema(label="Top Engineering Exams", href="/engineering/exams"),
            DataHighlightLinkSchema(label="Top Medicine Exams", href="/medical/exams"),
            DataHighlightLinkSchema(label="Top Law Exams", href="/law/exams"),
            DataHighlightLinkSchema(label="see more", href="/exams"),
        ],
    ),
    DataHighlightSchema(
        slug="college-predictors",
        title="College Predictors",
        description="Enter your score and category to see the colleges realistically within reach this admission cycle.",
        links=[
            DataHighlightLinkSchema(label="Top Engineering Colleges", href="/engineering/colleges"),
            DataHighlightLinkSchema(label="Top Medicine Colleges", href="/medical/colleges"),
            DataHighlightLinkSchema(label="Top Law Colleges", href="/law/colleges"),
            DataHighlightLinkSchema(label="see more", href="/predictors"),
        ],
    ),
    DataHighlightSchema(
        slug="rank-predictors",
        title="Rank Predictors",
        description="Turn a raw or percentile score into an expected rank using past years' normalisation data.",
        links=[
            DataHighlightLinkSchema(label="Top Engineering Colleges", href="/engineering/colleges"),
            DataHighlightLinkSchema(label="Top Medicine Colleges", href="/medical/colleges"),
            DataHighlightLinkSchema(label="Top Law Colleges", href="/law/colleges"),
            DataHighlightLinkSchema(label="see more", href="/predictors"),
        ],
    ),
]


async def get_home_data(db: AsyncSession) -> HomeDataSchema:
    college_svc = CollegeService(db)
    exam_svc = ExamService(db)
    location_svc = LocationService(db)
    article_svc = ArticleService(db)
    program_svc = ProgramService(db)

    featured_colleges = await college_svc.get_featured(limit=6)
    featured_exams = await exam_svc.get_featured(limit=6)
    locations = await location_svc.list_locations()
    articles = await article_svc.get_recent(limit=3)
    programs = await program_svc.get_recommended(limit=3)
    stream_counts = await college_svc.get_stream_counts()
    universities_raw = await college_svc.get_recommended_universities(limit=3)

    return HomeDataSchema(
        featuredColleges=featured_colleges,
        featuredExams=featured_exams,
        locations=locations,
        articles=articles,
        recommendedPrograms=programs,
        careerPanels=_CAREER_PANELS,
        recommendedUniversities=[
            RecommendedUniversitySchema(**u) for u in universities_raw
        ],
        dataHighlights=_DATA_HIGHLIGHTS,
        streams=[StreamCountSchema(name=s["name"], count=s["count"]) for s in stream_counts],
    )
