"""
Seed script — populates the database with data equivalent to frontend/src/lib/mock-data.ts
and syncs Meilisearch indexes.

Usage (from backend/ directory, with DB running):
    python seed.py
"""

import asyncio
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings
from models.article import Article
from models.college import College, OwnershipType
from models.course import Course
from models.cutoff import Cutoff
from models.exam import Exam, ExamLevel
from models.location import Location
from models.placement import Placement
from models.program import Program
from models.review import Review

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ─────────────────────────────────────────────────────────────────────────────
# Data definitions
# ─────────────────────────────────────────────────────────────────────────────

COLLEGES = [
    {
        "slug": "bengaluru-institute-of-management-studies",
        "name": "Bengaluru Institute of Management Studies",
        "city": "Bengaluru",
        "state": "Karnataka",
        "ownership": OwnershipType.PRIVATE,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 34,
        "rating": 4.4,
        "review_count": 612,
        "courses_offered": 6,
        "fees_range": "₹9.5L - 21L",
        "exams_accepted": ["CAT", "XAT", "GMAT"],
        "tags": ["Top Placements", "Featured"],
        "approvals": ["AICTE", "NAAC A++"],
        "established": 1998,
        "about": (
            "Bengaluru Institute of Management Studies (BIMS) is a private business school "
            "offering full-time MBA, executive MBA and doctoral programmes, with a placement "
            "record consistently ranked among the top private B-schools in South India."
        ),
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹18.4L Total Fees", "exams": ["CAT", "XAT", "GMAT"]},
            {"name": "Executive MBA", "duration": "15 Months", "mode": "Weekend", "fees": "₹12.6L Total Fees", "exams": ["CAT", "GMAT"]},
            {"name": "Ph.D. Management", "duration": "36 Months", "mode": "Full Time", "fees": "₹4.1L Total Fees", "exams": ["Institute Entrance Test"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹14.2 LPA",
            "median_package": "₹12.8 LPA",
            "highest_package": "₹42 LPA",
            "top_recruiters": ["Deloitte", "Amazon", "TCS", "Axis Bank", "Flipkart"],
        },
        "cutoffs": [
            {"exam": "CAT", "category": "General", "score": "92 percentile"},
            {"exam": "CAT", "category": "OBC", "score": "85 percentile"},
            {"exam": "XAT", "category": "General", "score": "88 percentile"},
        ],
        "reviews": [
            {
                "author_name": "Komal Mehra",
                "course": "MBA",
                "batch": "2022–24",
                "verified": True,
                "review_date": date(2025, 9, 3),
                "rating": 4.6,
                "body": "Placements were strong this year — around 90% of the batch placed before graduation, with the highest package touching ₹42 LPA. Faculty in the finance electives were particularly good.",
                "rating_placements": 4.6,
                "rating_faculty": 4.3,
                "rating_infrastructure": 4.5,
                "rating_campus_life": 4.2,
            },
            {
                "author_name": "Arjun Rao",
                "course": "Executive MBA",
                "batch": "2023–24",
                "verified": True,
                "review_date": date(2025, 7, 18),
                "rating": 4.2,
                "body": "Weekend batch worked well alongside my job. Campus infrastructure has improved a lot since the new block opened last year.",
                "rating_placements": 4.0,
                "rating_faculty": 4.2,
                "rating_infrastructure": 4.5,
                "rating_campus_life": 4.1,
            },
        ],
    },
    {
        "slug": "horizon-school-of-business",
        "name": "Horizon School of Business",
        "city": "Hyderabad",
        "state": "Telangana",
        "ownership": OwnershipType.PRIVATE,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 41,
        "rating": 4.1,
        "review_count": 348,
        "courses_offered": 5,
        "fees_range": "₹6.5L - 14L",
        "exams_accepted": ["CAT", "MAT", "CMAT"],
        "tags": ["Top Rated"],
        "approvals": ["AICTE"],
        "established": 2004,
        "about": "Horizon School of Business runs full-time and online MBA programmes with a focus on analytics and digital marketing specialisations.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹11.2L Total Fees", "exams": ["CAT", "MAT"]},
            {"name": "MBA (Online)", "duration": "24 Months", "mode": "Online", "fees": "₹4.3L Total Fees", "exams": ["CMAT"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹9.8 LPA",
            "median_package": "₹8.5 LPA",
            "highest_package": "₹24 LPA",
            "top_recruiters": ["Wipro", "ICICI Bank", "Byju's", "Cognizant"],
        },
        "cutoffs": [
            {"exam": "CAT", "category": "General", "score": "78 percentile"},
        ],
        "reviews": [
            {
                "author_name": "Sneha Patil",
                "course": "MBA",
                "batch": "2021–23",
                "verified": True,
                "review_date": date(2025, 2, 2),
                "rating": 4.0,
                "body": "Good faculty for marketing specialisation. Placement cell could follow up faster with smaller recruiters.",
                "rating_placements": 4.0,
                "rating_faculty": 4.2,
                "rating_infrastructure": 3.9,
                "rating_campus_life": 4.1,
            },
        ],
    },
    {
        "slug": "eastwind-institute-of-management",
        "name": "Eastwind Institute of Management",
        "city": "Pune",
        "state": "Maharashtra",
        "ownership": OwnershipType.DEEMED,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 22,
        "rating": 4.6,
        "review_count": 890,
        "courses_offered": 8,
        "fees_range": "₹15L - 24L",
        "exams_accepted": ["CAT", "XAT", "GMAT", "NMAT"],
        "tags": ["Top Placements", "Featured"],
        "approvals": ["AICTE", "NAAC A++", "UGC"],
        "established": 1985,
        "about": "Eastwind Institute of Management is a deemed university with one of the oldest MBA programmes in Western India, recognised for its finance and consulting placement tracks.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹21.8L Total Fees", "exams": ["CAT", "XAT", "GMAT"]},
            {"name": "MBA Business Analytics", "duration": "24 Months", "mode": "Full Time", "fees": "₹19.5L Total Fees", "exams": ["CAT", "NMAT"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹19.6 LPA",
            "median_package": "₹17.2 LPA",
            "highest_package": "₹58 LPA",
            "top_recruiters": ["Goldman Sachs", "McKinsey & Company", "Amazon", "BCG"],
        },
        "cutoffs": [
            {"exam": "CAT", "category": "General", "score": "97 percentile"},
            {"exam": "XAT", "category": "General", "score": "94 percentile"},
        ],
        "reviews": [
            {
                "author_name": "Rahul Nair",
                "course": "MBA",
                "batch": "2022–24",
                "verified": True,
                "review_date": date(2025, 6, 11),
                "rating": 4.7,
                "body": "Consulting placements are the strongest track here — three of the top five global firms recruited on campus this year.",
                "rating_placements": 4.8,
                "rating_faculty": 4.6,
                "rating_infrastructure": 4.5,
                "rating_campus_life": 4.4,
            },
        ],
    },
    # Clark University — referenced in recommended programs and universities
    {
        "slug": "clark-university",
        "name": "Clark University",
        "city": "Meerut",
        "state": "Uttar Pradesh",
        "ownership": OwnershipType.PRIVATE,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 55,
        "rating": 4.0,
        "review_count": 210,
        "courses_offered": 4,
        "fees_range": "₹4L - 10L",
        "exams_accepted": ["CAT", "MAT"],
        "tags": [],
        "approvals": ["AICTE"],
        "established": 2001,
        "about": "Clark University offers management and analytics programmes with strong industry connections in North India.",
        "is_featured": True,
        "courses": [
            {"name": "MS in Data Analytics", "duration": "12 Months", "mode": "Online", "fees": "INR 4,00,000", "exams": ["CAT"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹7.2 LPA",
            "median_package": "₹6.5 LPA",
            "highest_package": "₹15 LPA",
            "top_recruiters": ["Infosys", "HCL", "Wipro"],
        },
        "cutoffs": [],
        "reviews": [],
    },
    {
        "slug": "kr-mangalam-university",
        "name": "K. R. Mangalam University",
        "city": "Gurugram",
        "state": "Haryana",
        "ownership": OwnershipType.PRIVATE,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 62,
        "rating": 3.9,
        "review_count": 180,
        "courses_offered": 5,
        "fees_range": "₹3.5L - 9L",
        "exams_accepted": ["CAT", "MAT", "CMAT"],
        "tags": [],
        "approvals": ["AICTE", "UGC"],
        "established": 2013,
        "about": "K. R. Mangalam University is a multidisciplinary university in Gurugram with a focus on management, engineering and law programmes.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹7.5L Total Fees", "exams": ["CAT", "MAT"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹6.8 LPA",
            "median_package": "₹6.0 LPA",
            "highest_package": "₹12 LPA",
            "top_recruiters": ["TCS", "Infosys", "Deloitte"],
        },
        "cutoffs": [],
        "reviews": [],
    },
    {
        "slug": "swarnam-university",
        "name": "Swarnam Innovation University",
        "city": "Indore",
        "state": "Madhya Pradesh",
        "ownership": OwnershipType.PRIVATE,
        "stream": "Management",
        "ranking_authority": "NIRF",
        "ranking_rank": 70,
        "rating": 3.8,
        "review_count": 150,
        "courses_offered": 3,
        "fees_range": "₹4L - 8L",
        "exams_accepted": ["CAT", "CMAT"],
        "tags": [],
        "approvals": ["AICTE"],
        "established": 2010,
        "about": "Swarnam Innovation University focuses on startup culture and entrepreneurship-led management education.",
        "is_featured": True,
        "courses": [
            {"name": "PG Diploma in Management", "duration": "12 Months", "mode": "Online", "fees": "INR 3,60,000", "exams": ["CMAT"]},
        ],
        "placement": {
            "year": 2025,
            "average_package": "₹6.2 LPA",
            "median_package": "₹5.8 LPA",
            "highest_package": "₹11 LPA",
            "top_recruiters": ["Byju's", "Unacademy", "Zerodha"],
        },
        "cutoffs": [],
        "reviews": [],
    },
]

EXAMS = [
    {
        "slug": "cat",
        "name": "Common Admission Test (CAT)",
        "conducting_body": "IIM",
        "level": ExamLevel.NATIONAL,
        "description": "A national-level MBA entrance test conducted for admission into IIMs and 1000+ B-schools across India.",
        "registration_closes": "20 Sep 2026",
        "exam_date": "29 Nov 2026",
        "stream": "Management",
        "is_featured": True,
    },
    {
        "slug": "xat",
        "name": "Xavier Aptitude Test (XAT)",
        "conducting_body": "XLRI Jamshedpur",
        "level": ExamLevel.NATIONAL,
        "description": "Entrance exam for XLRI and 150+ other MBA institutes, known for its decision-making section.",
        "registration_closes": "30 Nov 2026",
        "exam_date": "4 Jan 2027",
        "stream": "Management",
        "is_featured": True,
    },
    {
        "slug": "karnataka-pgcet",
        "name": "Karnataka PGCET",
        "conducting_body": "KEA",
        "level": ExamLevel.STATE,
        "description": "State-level entrance test for MBA/MCA/M.Tech admissions into Karnataka's private and government colleges.",
        "registration_closes": "15 May 2026",
        "exam_date": "6 Jun 2026",
        "stream": "Management",
        "is_featured": True,
    },
    {
        "slug": "nmat",
        "name": "NMAT by GMAC",
        "conducting_body": "GMAC",
        "level": ExamLevel.NATIONAL,
        "description": "Multi-attempt MBA entrance test accepted by NMIMS, SPJIMR and 60+ leading business schools.",
        "registration_closes": "10 Oct 2026",
        "exam_date": "5 Nov 2026",
        "stream": "Management",
        "is_featured": True,
    },
    {
        "slug": "cmat",
        "name": "Common Management Admission Test (CMAT)",
        "conducting_body": "NTA",
        "level": ExamLevel.NATIONAL,
        "description": "NTA-conducted national test for AICTE-approved MBA and PGDM programmes across India.",
        "registration_closes": "25 Dec 2026",
        "exam_date": "28 Jan 2027",
        "stream": "Management",
        "is_featured": True,
    },
    {
        "slug": "mah-cet",
        "name": "MAH MBA CET",
        "conducting_body": "Maharashtra CET Cell",
        "level": ExamLevel.STATE,
        "description": "State entrance test for MBA and MMS seats in Maharashtra's government and private institutes.",
        "registration_closes": "20 Feb 2027",
        "exam_date": "12 Mar 2027",
        "stream": "Management",
        "is_featured": True,
    },
]

LOCATIONS = [
    {"slug": "bangalore", "name": "Bangalore", "state": "Karnataka", "college_count": 214},
    {"slug": "hyderabad", "name": "Hyderabad", "state": "Telangana", "college_count": 156},
    {"slug": "pune", "name": "Pune", "state": "Maharashtra", "college_count": 189},
    {"slug": "mumbai", "name": "Mumbai", "state": "Maharashtra", "college_count": 241},
    {"slug": "delhi-ncr", "name": "Delhi NCR", "state": "Delhi", "college_count": 302},
    {"slug": "chennai", "name": "Chennai", "state": "Tamil Nadu", "college_count": 167},
]

ARTICLES = [
    {
        "slug": "mba-admission-process-2026",
        "title": "MBA Admission Process 2026: Dates, Rounds & What's Changed",
        "excerpt": "PGDPM 2026 for working professionals will be held on 2 and 9 September...",
        "body": "The MBA admission process for 2026 has seen several key changes. PGDPM for working professionals is scheduled on 2 and 9 September 2026. Candidates must ensure their CAT scores are valid and apply before the deadlines announced by respective institutes.",
        "published_at": date(2026, 8, 9),
    },
    {
        "slug": "top-mba-placement-report-2026",
        "title": "MBA Placements 2026: Final Placement Report of Top Colleges",
        "excerpt": "The average and median package placed during the 2026 batch across ranked B-schools...",
        "body": "The average package across top-ranked B-schools rose to ₹18.2 LPA in 2026, up from ₹16.8 LPA in 2025. Eastwind Institute led with a highest package of ₹58 LPA. BIMS reported 90% placement before graduation day.",
        "published_at": date(2026, 8, 5),
    },
    {
        "slug": "executive-mba-eligibility-explained",
        "title": "Executive MBA Eligibility: Who Can Apply and When",
        "excerpt": "Executive MBA programmes accept candidates with a minimum of two years' work experience...",
        "body": "Executive MBA programmes are designed for working professionals. Most top institutes require a minimum of 2 years of full-time work experience. The GMAT or CAT score requirements are often lower than for full-time MBA programmes.",
        "published_at": date(2026, 8, 3),
    },
]

PROGRAMS = [
    {
        "slug": "ms-data-analytics",
        "name": "MS in Data Analytics",
        "university_name": "Clark University",
        "university_slug": "clark-university",
        "online_duration": "8 months",
        "online_fees": "INR 4,00,000",
        "online_fees_note": "(including taxes)",
        "on_campus_duration": "1 year",
        "on_campus_fees": "USD 17,000 (indicative)",
        "is_recommended": True,
    },
    {
        "slug": "ms-business-analytics",
        "name": "MS in Business Analytics",
        "university_name": "Eastwind Institute of Management",
        "university_slug": "eastwind-institute-of-management",
        "online_duration": "10 months",
        "online_fees": "INR 5,20,000",
        "online_fees_note": "(including taxes)",
        "on_campus_duration": "18 months",
        "on_campus_fees": "USD 21,500 (indicative)",
        "is_recommended": True,
    },
    {
        "slug": "pg-diploma-management",
        "name": "PG Diploma in Management",
        "university_name": "Horizon School of Business",
        "university_slug": "horizon-school-of-business",
        "online_duration": "12 months",
        "online_fees": "INR 3,60,000",
        "online_fees_note": "(including taxes)",
        "on_campus_duration": "2 years",
        "on_campus_fees": "USD 14,000 (indicative)",
        "is_recommended": True,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Seed helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _seed_colleges(session: AsyncSession) -> None:
    print("Seeding colleges …")
    for data in COLLEGES:
        courses_data = data.pop("courses")
        placement_data = data.pop("placement")
        cutoffs_data = data.pop("cutoffs")
        reviews_data = data.pop("reviews")

        college = College(id=uuid.uuid4(), **data)
        session.add(college)
        await session.flush()  # get college.id

        for c in courses_data:
            session.add(Course(id=uuid.uuid4(), college_id=college.id, **c))

        session.add(Placement(id=uuid.uuid4(), college_id=college.id, **placement_data))

        for co in cutoffs_data:
            session.add(Cutoff(id=uuid.uuid4(), college_id=college.id, **co))

        for r in reviews_data:
            session.add(Review(id=uuid.uuid4(), college_id=college.id, is_approved=True, **r))

    await session.commit()
    print(f"  ✓ {len(COLLEGES)} colleges seeded")


async def _seed_exams(session: AsyncSession) -> None:
    print("Seeding exams …")
    for data in EXAMS:
        session.add(Exam(id=uuid.uuid4(), **data))
    await session.commit()
    print(f"  ✓ {len(EXAMS)} exams seeded")


async def _seed_locations(session: AsyncSession) -> None:
    print("Seeding locations …")
    for data in LOCATIONS:
        session.add(Location(id=uuid.uuid4(), **data))
    await session.commit()
    print(f"  ✓ {len(LOCATIONS)} locations seeded")


async def _seed_articles(session: AsyncSession) -> None:
    print("Seeding articles …")
    for data in ARTICLES:
        session.add(Article(id=uuid.uuid4(), is_published=True, **data))
    await session.commit()
    print(f"  ✓ {len(ARTICLES)} articles seeded")


async def _seed_programs(session: AsyncSession) -> None:
    print("Seeding programs …")
    for data in PROGRAMS:
        session.add(Program(id=uuid.uuid4(), **data))
    await session.commit()
    print(f"  ✓ {len(PROGRAMS)} programs seeded")


async def _sync_meilisearch(session: AsyncSession) -> None:
    """Push colleges, exams, and locations to Meilisearch."""
    try:
        import meilisearch  # type: ignore
        from sqlalchemy import select
        from models.college import College as CollegeModel
        from models.exam import Exam as ExamModel
        from models.location import Location as LocationModel

        client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_API_KEY)

        colleges = (await session.execute(select(CollegeModel))).scalars().all()
        client.index("colleges").add_documents(
            [
                {
                    "id": str(c.id),
                    "slug": c.slug,
                    "name": c.name,
                    "city": c.city,
                    "state": c.state,
                    "stream": c.stream,
                    "about": c.about or "",
                }
                for c in colleges
            ]
        )

        exams = (await session.execute(select(ExamModel))).scalars().all()
        client.index("exams").add_documents(
            [
                {
                    "id": str(e.id),
                    "slug": e.slug,
                    "name": e.name,
                    "conductingBody": e.conducting_body,
                    "description": e.description,
                }
                for e in exams
            ]
        )

        locs = (await session.execute(select(LocationModel))).scalars().all()
        client.index("locations").add_documents(
            [{"id": str(l.id), "slug": l.slug, "name": l.name, "state": l.state} for l in locs]
        )

        print("  ✓ Meilisearch indexes synced")
    except Exception as e:
        print(f"  ⚠  Meilisearch sync skipped ({e})")


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

async def main() -> None:
    async with SessionLocal() as session:
        await _seed_colleges(session)
        await _seed_exams(session)
        await _seed_locations(session)
        await _seed_articles(session)
        await _seed_programs(session)
        await _sync_meilisearch(session)
    await engine.dispose()
    print("\nSeed complete.")


if __name__ == "__main__":
    asyncio.run(main())
