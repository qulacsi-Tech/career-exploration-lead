"""
Seed script — populates the database from frontend/src/lib/mock-data.ts (all 15 colleges)
and src/lib/articles-data.ts, then syncs Meilisearch indexes.

Usage (from backend/ directory, with DB running):
    alembic upgrade head
    python seed.py
"""

import asyncio
import os
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import settings
from core.security import hash_password
from models.article import Article
from models.college import College, OwnershipType
from models.course import Course
from models.cutoff import Cutoff
from models.exam import Exam, ExamLevel
from models.location import Location
from models.placement import Placement
from models.program import Program
from models.review import Review
from models.course_catalogue import CourseCatalogue
from models.specialisation import Specialisation
from models.ranking import RankingList, RankingEntry
from models.user import User, UserRole

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ─────────────────────────────────────────────────────────────────────────────
# COLLEGES  (all 15 from mock-data.ts)
# ─────────────────────────────────────────────────────────────────────────────

COLLEGES = [
    # ── Management ───────────────────────────────────────────────────────────
    {
        "slug": "bengaluru-institute-of-management-studies",
        "name": "Bengaluru Institute of Management Studies",
        "city": "Bengaluru", "state": "Karnataka",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 34,
        "rating": 4.4, "review_count": 612, "courses_offered": 6,
        "fees_range": "₹9.5L - 21L",
        "exams_accepted": ["CAT", "XAT", "GMAT"],
        "tags": ["Top Placements", "Featured"],
        "approvals": ["AICTE", "NAAC A++"],
        "established": 1998,
        "about": "Bengaluru Institute of Management Studies (BIMS) is a private business school offering full-time MBA, executive MBA and doctoral programmes, with a placement record consistently ranked among the top private B-schools in South India.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹18.4L Total Fees", "exams": ["CAT", "XAT", "GMAT"]},
            {"name": "Executive MBA", "duration": "15 Months", "mode": "Weekend", "fees": "₹12.6L Total Fees", "exams": ["CAT", "GMAT"]},
            {"name": "Ph.D. Management", "duration": "36 Months", "mode": "Full Time", "fees": "₹4.1L Total Fees", "exams": ["Institute Entrance Test"]},
        ],
        "placement": {"year": 2025, "average_package": "₹14.2 LPA", "median_package": "₹12.8 LPA", "highest_package": "₹42 LPA", "top_recruiters": ["Deloitte", "Amazon", "TCS", "Axis Bank", "Flipkart"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "92 percentile"}, {"exam": "CAT", "category": "OBC", "score": "85 percentile"}, {"exam": "XAT", "category": "General", "score": "88 percentile"}],
        "reviews": [
            {"author_name": "Komal Mehra", "course": "MBA", "batch": "2022–24", "verified": True, "review_date": date(2025, 9, 3), "rating": 4.6, "body": "Placements were strong this year — around 90% of the batch placed before graduation, with the highest package touching ₹42 LPA. Faculty in the finance electives were particularly good.", "rating_placements": 4.6, "rating_faculty": 4.3, "rating_infrastructure": 4.5, "rating_campus_life": 4.2},
            {"author_name": "Arjun Rao", "course": "Executive MBA", "batch": "2023–24", "verified": True, "review_date": date(2025, 7, 18), "rating": 4.2, "body": "Weekend batch worked well alongside my job. Campus infrastructure has improved a lot since the new block opened last year.", "rating_placements": 4.0, "rating_faculty": 4.2, "rating_infrastructure": 4.5, "rating_campus_life": 4.1},
        ],
    },
    {
        "slug": "horizon-school-of-business",
        "name": "Horizon School of Business",
        "city": "Hyderabad", "state": "Telangana",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 41,
        "rating": 4.1, "review_count": 348, "courses_offered": 5,
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
        "placement": {"year": 2025, "average_package": "₹9.8 LPA", "median_package": "₹8.5 LPA", "highest_package": "₹24 LPA", "top_recruiters": ["Wipro", "ICICI Bank", "Byju's", "Cognizant"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "78 percentile"}],
        "reviews": [{"author_name": "Sneha Patil", "course": "MBA", "batch": "2021–23", "verified": True, "review_date": date(2025, 2, 2), "rating": 4.0, "body": "Good faculty for marketing specialisation. Placement cell could follow up faster with smaller recruiters.", "rating_placements": 4.0, "rating_faculty": 4.2, "rating_infrastructure": 3.9, "rating_campus_life": 4.1}],
    },
    {
        "slug": "eastwind-institute-of-management",
        "name": "Eastwind Institute of Management",
        "city": "Pune", "state": "Maharashtra",
        "ownership": OwnershipType.DEEMED, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 22,
        "rating": 4.6, "review_count": 890, "courses_offered": 8,
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
        "placement": {"year": 2025, "average_package": "₹19.6 LPA", "median_package": "₹17.2 LPA", "highest_package": "₹58 LPA", "top_recruiters": ["Goldman Sachs", "McKinsey & Company", "Amazon", "BCG"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "97 percentile"}, {"exam": "XAT", "category": "General", "score": "94 percentile"}],
        "reviews": [{"author_name": "Rahul Nair", "course": "MBA", "batch": "2022–24", "verified": True, "review_date": date(2025, 6, 11), "rating": 4.7, "body": "Consulting placements are the strongest track here — three of the top five global firms recruited on campus this year.", "rating_placements": 4.8, "rating_faculty": 4.6, "rating_infrastructure": 4.5, "rating_campus_life": 4.4}],
    },
    # ── Engineering ──────────────────────────────────────────────────────────
    {
        "slug": "kaveri-institute-of-technology",
        "name": "Kaveri Institute of Technology",
        "city": "Bengaluru", "state": "Karnataka",
        "ownership": OwnershipType.PRIVATE, "stream": "Engineering",
        "ranking_authority": "NIRF", "ranking_rank": 48,
        "rating": 4.3, "review_count": 1204, "courses_offered": 12,
        "fees_range": "₹4.2L - 9.6L",
        "exams_accepted": ["JEE Main", "KCET", "COMEDK"],
        "tags": ["Top Placements"],
        "approvals": ["AICTE", "NBA", "NAAC A+"],
        "established": 1992,
        "about": "Kaveri Institute of Technology is a private engineering college offering B.Tech and M.Tech programmes across nine branches, with a computer science intake that fills on KCET rank alone most years.",
        "is_featured": True,
        "courses": [
            {"name": "B.Tech Computer Science", "duration": "48 Months", "mode": "Full Time", "fees": "₹9.6L Total Fees", "exams": ["JEE Main", "KCET", "COMEDK"]},
            {"name": "B.Tech Electronics", "duration": "48 Months", "mode": "Full Time", "fees": "₹7.8L Total Fees", "exams": ["JEE Main", "KCET"]},
            {"name": "M.Tech VLSI Design", "duration": "24 Months", "mode": "Full Time", "fees": "₹4.2L Total Fees", "exams": ["GATE"]},
        ],
        "placement": {"year": 2025, "average_package": "₹8.4 LPA", "median_package": "₹7.1 LPA", "highest_package": "₹44 LPA", "top_recruiters": ["Infosys", "Wipro", "Bosch", "Qualcomm", "Zoho"]},
        "cutoffs": [{"exam": "KCET", "category": "General", "score": "Rank 2,480"}, {"exam": "COMEDK", "category": "General", "score": "Rank 3,150"}, {"exam": "JEE Main", "category": "General", "score": "94.2 percentile"}],
        "reviews": [{"author_name": "Sneha Kulkarni", "course": "B.Tech Computer Science", "batch": "2021–25", "verified": True, "review_date": date(2025, 7, 22), "rating": 4.4, "body": "Core CS placements were solid — most of the branch had an offer by the eighth semester. Labs are well equipped, though the hostel needs work.", "rating_placements": 4.4, "rating_faculty": 4.1, "rating_infrastructure": 4.4, "rating_campus_life": 4.2}],
    },
    {
        "slug": "northgate-college-of-engineering",
        "name": "Northgate College of Engineering",
        "city": "Pune", "state": "Maharashtra",
        "ownership": OwnershipType.PRIVATE, "stream": "Engineering",
        "ranking_authority": "NIRF", "ranking_rank": 63,
        "rating": 4.0, "review_count": 742, "courses_offered": 9,
        "fees_range": "₹3.4L - 7.2L",
        "exams_accepted": ["JEE Main", "MHT CET"],
        "tags": ["Top Rated"],
        "approvals": ["AICTE", "NBA"],
        "established": 2001,
        "about": "Northgate College of Engineering runs B.Tech programmes with an industry-linked mechanical and mechatronics track, drawing recruiters from the Pune automotive belt.",
        "is_featured": False,
        "courses": [
            {"name": "B.Tech Mechanical", "duration": "48 Months", "mode": "Full Time", "fees": "₹6.4L Total Fees", "exams": ["JEE Main", "MHT CET"]},
            {"name": "B.Tech Computer Science", "duration": "48 Months", "mode": "Full Time", "fees": "₹7.2L Total Fees", "exams": ["JEE Main", "MHT CET"]},
        ],
        "placement": {"year": 2025, "average_package": "₹6.2 LPA", "median_package": "₹5.4 LPA", "highest_package": "₹28 LPA", "top_recruiters": ["Tata Motors", "Bajaj Auto", "TCS", "Cognizant"]},
        "cutoffs": [{"exam": "MHT CET", "category": "General", "score": "96.1 percentile"}, {"exam": "JEE Main", "category": "General", "score": "88.5 percentile"}],
        "reviews": [{"author_name": "Aditya Deshmukh", "course": "B.Tech Mechanical", "batch": "2020–24", "verified": True, "review_date": date(2025, 5, 5), "rating": 4.1, "body": "The automotive tie-ups are the real draw — two internships came through the department directly.", "rating_placements": 4.0, "rating_faculty": 4.1, "rating_infrastructure": 3.9, "rating_campus_life": 4.0}],
    },
    # ── Medical ──────────────────────────────────────────────────────────────
    {
        "slug": "sanjeevani-medical-college",
        "name": "Sanjeevani Medical College",
        "city": "Chennai", "state": "Tamil Nadu",
        "ownership": OwnershipType.PRIVATE, "stream": "Medical",
        "ranking_authority": "NIRF", "ranking_rank": 29,
        "rating": 4.5, "review_count": 538, "courses_offered": 7,
        "fees_range": "₹12L - 68L",
        "exams_accepted": ["NEET UG", "NEET PG"],
        "tags": ["Featured"],
        "approvals": ["NMC", "NAAC A++"],
        "established": 1976,
        "about": "Sanjeevani Medical College is a private medical college with an attached 1,200-bed teaching hospital, offering MBBS alongside postgraduate programmes across eleven clinical specialities.",
        "is_featured": True,
        "courses": [
            {"name": "MBBS", "duration": "66 Months", "mode": "Full Time", "fees": "₹68L Total Fees", "exams": ["NEET UG"]},
            {"name": "MD General Medicine", "duration": "36 Months", "mode": "Full Time", "fees": "₹42L Total Fees", "exams": ["NEET PG"]},
        ],
        "placement": {"year": 2025, "average_package": "₹11.8 LPA", "median_package": "₹10.4 LPA", "highest_package": "₹24 LPA", "top_recruiters": ["Apollo Hospitals", "Fortis Healthcare", "Manipal Hospitals"]},
        "cutoffs": [{"exam": "NEET UG", "category": "General", "score": "612 marks"}, {"exam": "NEET UG", "category": "OBC", "score": "584 marks"}],
        "reviews": [{"author_name": "Divya Ramesh", "course": "MBBS", "batch": "2019–25", "verified": True, "review_date": date(2025, 8, 2), "rating": 4.5, "body": "Clinical exposure from the second year onwards is the strength here — the attached hospital sees enough volume that you are never short of cases.", "rating_placements": 4.3, "rating_faculty": 4.7, "rating_infrastructure": 4.6, "rating_campus_life": 4.2}],
    },
    {
        "slug": "meridian-institute-of-medical-sciences",
        "name": "Meridian Institute of Medical Sciences",
        "city": "Hyderabad", "state": "Telangana",
        "ownership": OwnershipType.DEEMED, "stream": "Medical",
        "ranking_authority": "NIRF", "ranking_rank": 44,
        "rating": 4.2, "review_count": 396, "courses_offered": 6,
        "fees_range": "₹15L - 74L",
        "exams_accepted": ["NEET UG", "NEET PG"],
        "tags": ["Top Rated"],
        "approvals": ["NMC", "UGC", "NAAC A+"],
        "established": 1994,
        "about": "Meridian Institute of Medical Sciences is a deemed university running MBBS and postgraduate medical programmes, with a research wing focused on community and preventive medicine.",
        "is_featured": False,
        "courses": [
            {"name": "MBBS", "duration": "66 Months", "mode": "Full Time", "fees": "₹74L Total Fees", "exams": ["NEET UG"]},
            {"name": "MD Paediatrics", "duration": "36 Months", "mode": "Full Time", "fees": "₹38L Total Fees", "exams": ["NEET PG"]},
        ],
        "placement": {"year": 2025, "average_package": "₹9.6 LPA", "median_package": "₹8.8 LPA", "highest_package": "₹19 LPA", "top_recruiters": ["Yashoda Hospitals", "Continental Hospitals", "AIG Hospitals"]},
        "cutoffs": [{"exam": "NEET UG", "category": "General", "score": "578 marks"}, {"exam": "NEET UG", "category": "SC", "score": "492 marks"}],
        "reviews": [{"author_name": "Imran Sheikh", "course": "MBBS", "batch": "2018–24", "verified": True, "review_date": date(2025, 6, 17), "rating": 4.2, "body": "Faculty in the pre-clinical years were excellent. Fees are steep, which is worth going in clear-eyed about.", "rating_placements": 4.1, "rating_faculty": 4.4, "rating_infrastructure": 4.3, "rating_campus_life": 4.0}],
    },
    # ── More Management ───────────────────────────────────────────────────────
    {
        "slug": "kr-mangalam-university",
        "name": "K.R. Mangalam University",
        "city": "Gurugram", "state": "Haryana",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 58,
        "rating": 4.2, "review_count": 764, "courses_offered": 14,
        "fees_range": "₹3.6L - 12L",
        "exams_accepted": ["CAT", "MAT", "CMAT", "CUET"],
        "tags": ["Top Rated"],
        "approvals": ["UGC", "AICTE", "NAAC A+"],
        "established": 2013,
        "about": "K.R. Mangalam University is a private university in Gurugram offering programmes across management, engineering, law and applied sciences, with an on-campus placement cell serving the Delhi NCR recruiter base.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹12L Total Fees", "exams": ["CAT", "MAT", "CMAT"]},
            {"name": "BBA", "duration": "36 Months", "mode": "Full Time", "fees": "₹5.4L Total Fees", "exams": ["CUET"]},
            {"name": "B.Tech Computer Science", "duration": "48 Months", "mode": "Full Time", "fees": "₹8.8L Total Fees", "exams": ["JEE Main", "CUET"]},
        ],
        "placement": {"year": 2025, "average_package": "₹7.4 LPA", "median_package": "₹6.5 LPA", "highest_package": "₹32 LPA", "top_recruiters": ["Deloitte", "HCLTech", "Amazon", "Genpact", "ICICI Bank"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "72 percentile"}, {"exam": "MAT", "category": "General", "score": "80 percentile"}, {"exam": "CUET", "category": "General", "score": "185 marks"}],
        "reviews": [{"author_name": "Nikhil Chauhan", "course": "MBA", "batch": "2023–25", "verified": True, "review_date": date(2026, 8, 14), "rating": 4.2, "body": "Campus is modern and the NCR location helps with internships — several of my batch interned in Gurugram itself during the second semester.", "rating_placements": 4.1, "rating_faculty": 4.3, "rating_infrastructure": 4.4, "rating_campus_life": 4.2}],
    },
    {
        "slug": "ashwattha-business-school",
        "name": "Ashwattha Business School",
        "city": "Pune", "state": "Maharashtra",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 41,
        "rating": 4.3, "review_count": 528, "courses_offered": 5,
        "fees_range": "₹8.2L - 16L",
        "exams_accepted": ["CAT", "XAT", "CMAT", "MAH MBA CET"],
        "tags": ["Top Placements"],
        "approvals": ["AICTE", "NAAC A"],
        "established": 2004,
        "about": "Ashwattha Business School is a private management institute in Pune running full-time and executive MBA programmes, with an industry-interface cell built around the city's manufacturing and IT recruiter base.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹14.6L Total Fees", "exams": ["CAT", "XAT", "MAH MBA CET"]},
            {"name": "PGDM Marketing", "duration": "24 Months", "mode": "Full Time", "fees": "₹13.2L Total Fees", "exams": ["CAT", "CMAT"]},
            {"name": "Executive MBA", "duration": "18 Months", "mode": "Weekend", "fees": "₹8.2L Total Fees", "exams": ["CAT"]},
        ],
        "placement": {"year": 2025, "average_package": "₹11.2 LPA", "median_package": "₹9.8 LPA", "highest_package": "₹34 LPA", "top_recruiters": ["Bajaj Finserv", "Tata Motors", "Infosys", "Deloitte", "Kotak"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "84 percentile"}, {"exam": "XAT", "category": "General", "score": "80 percentile"}, {"exam": "MAH MBA CET", "category": "General", "score": "99.1 percentile"}],
        "reviews": [{"author_name": "Rutuja Deshpande", "course": "MBA", "batch": "2023–25", "verified": True, "review_date": date(2026, 9, 2), "rating": 4.3, "body": "The marketing electives are taught largely by practitioners, which showed in how specific the live projects were. Placement week is well run.", "rating_placements": 4.4, "rating_faculty": 4.2, "rating_infrastructure": 4.3, "rating_campus_life": 4.1}],
    },
    {
        "slug": "vantage-school-of-management",
        "name": "Vantage School of Management",
        "city": "Hyderabad", "state": "Telangana",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 47,
        "rating": 4.1, "review_count": 392, "courses_offered": 4,
        "fees_range": "₹7.5L - 15L",
        "exams_accepted": ["CAT", "NMAT", "CMAT"],
        "tags": ["Featured"],
        "approvals": ["AICTE", "NAAC A"],
        "established": 2009,
        "about": "Vantage School of Management offers MBA and PGDM programmes in Hyderabad with concentrations in analytics and product management, drawing recruiters from the city's technology corridor.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹13.4L Total Fees", "exams": ["CAT", "NMAT"]},
            {"name": "PGDM Business Analytics", "duration": "24 Months", "mode": "Full Time", "fees": "₹15L Total Fees", "exams": ["CAT", "CMAT"]},
        ],
        "placement": {"year": 2025, "average_package": "₹10.4 LPA", "median_package": "₹9.2 LPA", "highest_package": "₹28 LPA", "top_recruiters": ["Microsoft", "Deloitte", "ZS Associates", "Cognizant", "Darwinbox"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "80 percentile"}, {"exam": "NMAT", "category": "General", "score": "215"}],
        "reviews": [{"author_name": "Sreekar Reddy", "course": "PGDM Business Analytics", "batch": "2023–25", "verified": True, "review_date": date(2026, 8, 21), "rating": 4.1, "body": "Analytics track is genuinely technical — SQL and Python are assessed, not assumed. Campus is smaller than the brochure suggests.", "rating_placements": 4.2, "rating_faculty": 4.0, "rating_infrastructure": 4.2, "rating_campus_life": 4.0}],
    },
    # ── Engineering (2) ───────────────────────────────────────────────────────
    {
        "slug": "cascade-institute-of-technology",
        "name": "Cascade Institute of Technology",
        "city": "Chennai", "state": "Tamil Nadu",
        "ownership": OwnershipType.PRIVATE, "stream": "Engineering",
        "ranking_authority": "NIRF", "ranking_rank": 52,
        "rating": 4.0, "review_count": 611, "courses_offered": 9,
        "fees_range": "₹4.2L - 9.6L",
        "exams_accepted": ["JEE Main", "TNEA", "VITEEE"],
        "tags": ["Top Rated"],
        "approvals": ["AICTE", "NBA", "NAAC A"],
        "established": 1997,
        "about": "Cascade Institute of Technology is a private engineering college in Chennai offering undergraduate and postgraduate programmes across computing, electronics and mechanical disciplines.",
        "is_featured": False,
        "courses": [
            {"name": "B.Tech Computer Science", "duration": "48 Months", "mode": "Full Time", "fees": "₹9.6L Total Fees", "exams": ["JEE Main", "TNEA"]},
            {"name": "B.Tech Electronics", "duration": "48 Months", "mode": "Full Time", "fees": "₹8.4L Total Fees", "exams": ["JEE Main", "TNEA"]},
            {"name": "M.Tech Data Science", "duration": "24 Months", "mode": "Full Time", "fees": "₹4.2L Total Fees", "exams": ["GATE"]},
        ],
        "placement": {"year": 2025, "average_package": "₹6.8 LPA", "median_package": "₹5.9 LPA", "highest_package": "₹26 LPA", "top_recruiters": ["Zoho", "TCS", "Freshworks", "Qualcomm", "Wipro"]},
        "cutoffs": [{"exam": "JEE Main", "category": "General", "score": "91 percentile"}, {"exam": "TNEA", "category": "General", "score": "188 cutoff marks"}],
        "reviews": [{"author_name": "Divya Lakshmi", "course": "B.Tech Computer Science", "batch": "2021–25", "verified": True, "review_date": date(2026, 7, 11), "rating": 4.0, "body": "Core CS teaching is solid and the Chennai product companies recruit here consistently. Labs could do with refreshing.", "rating_placements": 4.0, "rating_faculty": 4.1, "rating_infrastructure": 3.9, "rating_campus_life": 4.0}],
    },
    # ── Commerce ──────────────────────────────────────────────────────────────
    {
        "slug": "silverleaf-college-of-commerce",
        "name": "Silverleaf College of Commerce",
        "city": "Ahmedabad", "state": "Gujarat",
        "ownership": OwnershipType.PRIVATE, "stream": "Commerce",
        "ranking_authority": "NIRF", "ranking_rank": 63,
        "rating": 4.2, "review_count": 287, "courses_offered": 6,
        "fees_range": "₹2.4L - 7.8L",
        "exams_accepted": ["CUET", "CAT", "CMAT"],
        "tags": ["Fastest Emerging"],
        "approvals": ["UGC", "NAAC A"],
        "established": 2011,
        "about": "Silverleaf College of Commerce runs undergraduate and postgraduate commerce programmes in Ahmedabad, with pathways into chartered accountancy and financial services.",
        "is_featured": False,
        "courses": [
            {"name": "B.Com (Hons)", "duration": "36 Months", "mode": "Full Time", "fees": "₹2.4L Total Fees", "exams": ["CUET"]},
            {"name": "M.Com", "duration": "24 Months", "mode": "Full Time", "fees": "₹3.1L Total Fees", "exams": ["CUET"]},
            {"name": "MBA Finance", "duration": "24 Months", "mode": "Full Time", "fees": "₹7.8L Total Fees", "exams": ["CAT", "CMAT"]},
        ],
        "placement": {"year": 2025, "average_package": "₹5.6 LPA", "median_package": "₹4.9 LPA", "highest_package": "₹18 LPA", "top_recruiters": ["Deloitte", "EY", "Adani Group", "HDFC Bank", "Grant Thornton"]},
        "cutoffs": [{"exam": "CUET", "category": "General", "score": "172 marks"}, {"exam": "CAT", "category": "General", "score": "68 percentile"}],
        "reviews": [{"author_name": "Meet Patel", "course": "B.Com (Hons)", "batch": "2022–25", "verified": True, "review_date": date(2026, 6, 29), "rating": 4.2, "body": "Faculty are strong on accounting fundamentals and the CA coaching tie-up saved me a separate enrolment.", "rating_placements": 4.0, "rating_faculty": 4.3, "rating_infrastructure": 4.1, "rating_campus_life": 4.2}],
    },
    # ── More Management ───────────────────────────────────────────────────────
    {
        "slug": "meridian-school-of-business",
        "name": "Meridian School of Business",
        "city": "Delhi NCR", "state": "Delhi",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 38,
        "rating": 4.4, "review_count": 704, "courses_offered": 5,
        "fees_range": "₹11L - 19.5L",
        "exams_accepted": ["CAT", "XAT", "GMAT", "NMAT"],
        "tags": ["Top Placements", "Featured"],
        "approvals": ["AICTE", "NAAC A++"],
        "established": 1996,
        "about": "Meridian School of Business is a private B-school in Delhi NCR offering full-time MBA and executive programmes, with consulting and financial services making up the bulk of its recruiter base.",
        "is_featured": True,
        "courses": [
            {"name": "MBA", "duration": "24 Months", "mode": "Full Time", "fees": "₹19.5L Total Fees", "exams": ["CAT", "XAT", "GMAT"]},
            {"name": "Executive MBA", "duration": "15 Months", "mode": "Weekend", "fees": "₹11L Total Fees", "exams": ["GMAT"]},
        ],
        "placement": {"year": 2025, "average_package": "₹15.8 LPA", "median_package": "₹14.2 LPA", "highest_package": "₹44 LPA", "top_recruiters": ["McKinsey", "Bain", "Goldman Sachs", "Accenture", "HUL"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "93 percentile"}, {"exam": "XAT", "category": "General", "score": "90 percentile"}, {"exam": "GMAT", "category": "General", "score": "680"}],
        "reviews": [{"author_name": "Ananya Mehrotra", "course": "MBA", "batch": "2023–25", "verified": True, "review_date": date(2026, 8, 18), "rating": 4.4, "body": "Consulting prep is the strongest part of the experience — case interview practice is structured and alumni turn up for it.", "rating_placements": 4.6, "rating_faculty": 4.4, "rating_infrastructure": 4.3, "rating_campus_life": 4.2}],
    },
    {
        "slug": "sahyadri-institute-of-management",
        "name": "Sahyadri Institute of Management",
        "city": "Mumbai", "state": "Maharashtra",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 44,
        "rating": 4.2, "review_count": 466, "courses_offered": 4,
        "fees_range": "₹9L - 17.5L",
        "exams_accepted": ["CAT", "NMAT", "MAH MBA CET", "CMAT"],
        "tags": ["Top Rated"],
        "approvals": ["AICTE", "NAAC A+"],
        "established": 2001,
        "about": "Sahyadri Institute of Management runs MBA and PGDM programmes in Mumbai with concentrations in finance and operations, drawing on the city's banking and logistics employers.",
        "is_featured": False,
        "courses": [
            {"name": "MBA Finance", "duration": "24 Months", "mode": "Full Time", "fees": "₹17.5L Total Fees", "exams": ["CAT", "NMAT"]},
            {"name": "PGDM Operations", "duration": "24 Months", "mode": "Full Time", "fees": "₹15.2L Total Fees", "exams": ["CAT", "MAH MBA CET"]},
        ],
        "placement": {"year": 2025, "average_package": "₹12.6 LPA", "median_package": "₹11.4 LPA", "highest_package": "₹31 LPA", "top_recruiters": ["HDFC Bank", "JP Morgan", "Maersk", "Nomura", "Aditya Birla"]},
        "cutoffs": [{"exam": "CAT", "category": "General", "score": "86 percentile"}, {"exam": "NMAT", "category": "General", "score": "225"}],
        "reviews": [{"author_name": "Farhan Qureshi", "course": "MBA Finance", "batch": "2023–25", "verified": True, "review_date": date(2026, 9, 5), "rating": 4.2, "body": "Finance curriculum is demanding and the Mumbai location means guest sessions actually happen weekly rather than once a term.", "rating_placements": 4.3, "rating_faculty": 4.1, "rating_infrastructure": 4.2, "rating_campus_life": 4.1}],
    },
    # ── Recommended Universities ──────────────────────────────────────────────
    {
        "slug": "clark-university",
        "name": "Clark University",
        "city": "Meerut", "state": "Uttar Pradesh",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 55,
        "rating": 4.0, "review_count": 210, "courses_offered": 4,
        "fees_range": "₹4L - 10L",
        "exams_accepted": ["CAT", "MAT"],
        "tags": [],
        "approvals": ["AICTE"],
        "established": 2001,
        "about": "Clark University offers management and analytics programmes with strong industry connections in North India.",
        "is_featured": True,
        "courses": [{"name": "MS in Data Analytics", "duration": "12 Months", "mode": "Online", "fees": "INR 4,00,000", "exams": ["CAT"]}],
        "placement": {"year": 2025, "average_package": "₹7.2 LPA", "median_package": "₹6.5 LPA", "highest_package": "₹15 LPA", "top_recruiters": ["Infosys", "HCL", "Wipro"]},
        "cutoffs": [],
        "reviews": [],
    },
    {
        "slug": "swarnam-university",
        "name": "Swarnam Innovation University",
        "city": "Indore", "state": "Madhya Pradesh",
        "ownership": OwnershipType.PRIVATE, "stream": "Management",
        "ranking_authority": "NIRF", "ranking_rank": 70,
        "rating": 3.8, "review_count": 150, "courses_offered": 3,
        "fees_range": "₹4L - 8L",
        "exams_accepted": ["CAT", "CMAT"],
        "tags": [],
        "approvals": ["AICTE"],
        "established": 2010,
        "about": "Swarnam Innovation University focuses on startup culture and entrepreneurship-led management education.",
        "is_featured": True,
        "courses": [{"name": "PG Diploma in Management", "duration": "12 Months", "mode": "Online", "fees": "INR 3,60,000", "exams": ["CMAT"]}],
        "placement": {"year": 2025, "average_package": "₹6.2 LPA", "median_package": "₹5.8 LPA", "highest_package": "₹11 LPA", "top_recruiters": ["Byju's", "Unacademy", "Zerodha"]},
        "cutoffs": [],
        "reviews": [],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# EXAMS
# ─────────────────────────────────────────────────────────────────────────────

EXAMS = [
    {"slug": "cat", "name": "Common Admission Test (CAT)", "conducting_body": "IIM", "level": ExamLevel.NATIONAL, "description": "A national-level MBA entrance test conducted for admission into IIMs and 1000+ B-schools across India.", "registration_closes": "20 Sep 2026", "exam_date": "29 Nov 2026", "stream": "Management", "is_featured": True, "mode": "Online", "frequency": "Once a year", "application_fee": "₹2,400", "official_site": "iimcat.ac.in", "duration_minutes": 120, "sections": ["VARC", "DILR", "QA"]},
    {"slug": "xat", "name": "Xavier Aptitude Test (XAT)", "conducting_body": "XLRI Jamshedpur", "level": ExamLevel.NATIONAL, "description": "Entrance exam for XLRI and 150+ other MBA institutes, known for its decision-making section.", "registration_closes": "30 Nov 2026", "exam_date": "4 Jan 2027", "stream": "Management", "is_featured": True, "mode": "Online", "frequency": "Once a year", "application_fee": "₹1,800", "official_site": "xatonline.in", "duration_minutes": 210, "sections": ["Verbal & Logical Ability", "Decision Making", "QA & DI", "GK"]},
    {"slug": "karnataka-pgcet", "name": "Karnataka PGCET", "conducting_body": "KEA", "level": ExamLevel.STATE, "description": "State-level entrance test for MBA/MCA/M.Tech admissions into Karnataka's private and government colleges.", "registration_closes": "15 May 2026", "exam_date": "6 Jun 2026", "stream": "Management", "is_featured": True, "mode": "Offline", "frequency": "Once a year", "application_fee": "₹650", "official_site": "kea.kar.nic.in", "duration_minutes": 120, "sections": ["Management Aptitude"]},
    {"slug": "nmat", "name": "NMAT by GMAC", "conducting_body": "GMAC", "level": ExamLevel.NATIONAL, "description": "Multi-attempt MBA entrance test accepted by NMIMS, SPJIMR and 60+ leading business schools.", "registration_closes": "10 Oct 2026", "exam_date": "5 Nov 2026", "stream": "Management", "is_featured": True, "mode": "Online", "frequency": "Multiple windows", "application_fee": "₹2,800", "official_site": "nmat.org.in", "duration_minutes": 120, "sections": ["Language Skills", "Quantitative Skills", "Logical Reasoning"]},
    {"slug": "cmat", "name": "Common Management Admission Test (CMAT)", "conducting_body": "NTA", "level": ExamLevel.NATIONAL, "description": "NTA-conducted national test for AICTE-approved MBA and PGDM programmes across India.", "registration_closes": "25 Dec 2026", "exam_date": "28 Jan 2027", "stream": "Management", "is_featured": True, "mode": "Online", "frequency": "Once a year", "application_fee": "₹2,000", "official_site": "ntacmat.nic.in", "duration_minutes": 180, "sections": ["Quantitative Techniques", "Logical Reasoning", "Language Comprehension", "General Awareness", "Innovation & Entrepreneurship"]},
    {"slug": "mah-cet", "name": "MAH MBA CET", "conducting_body": "Maharashtra CET Cell", "level": ExamLevel.STATE, "description": "State entrance test for MBA and MMS seats in Maharashtra's government and private institutes.", "registration_closes": "20 Feb 2027", "exam_date": "12 Mar 2027", "stream": "Management", "is_featured": True, "mode": "Online", "frequency": "Once a year", "application_fee": "₹1,000", "official_site": "cetcell.mahacet.org", "duration_minutes": 150, "sections": ["Logical Reasoning", "Abstract Reasoning", "Quantitative Aptitude", "Verbal Ability & Reading Comprehension"]},
    {"slug": "jee-main", "name": "JEE Main", "conducting_body": "NTA", "level": ExamLevel.NATIONAL, "description": "National entrance exam for B.Tech/B.E. admissions into NITs, IIITs and other centrally funded technical institutes.", "registration_closes": "30 Nov 2026", "exam_date": "Jan 2027", "stream": "Engineering", "is_featured": True, "mode": "Online", "frequency": "Twice a year", "application_fee": "₹1,000", "official_site": "jeemain.nta.nic.in", "duration_minutes": 180, "sections": ["Mathematics", "Physics", "Chemistry"]},
    {"slug": "gate", "name": "GATE", "conducting_body": "IIT / IISc", "level": ExamLevel.NATIONAL, "description": "Graduate Aptitude Test in Engineering for M.Tech admissions and PSU recruitment.", "registration_closes": "3 Oct 2026", "exam_date": "1 Feb 2027", "stream": "Engineering", "is_featured": True, "mode": "Online", "frequency": "Once a year", "application_fee": "₹1,800", "official_site": "gate2027.iitr.ac.in", "duration_minutes": 180, "sections": ["General Aptitude", "Core Engineering Subject"]},
    {"slug": "neet-ug", "name": "NEET UG", "conducting_body": "NTA", "level": ExamLevel.NATIONAL, "description": "The single national entrance test for MBBS and BDS admissions across all medical colleges in India.", "registration_closes": "7 Mar 2027", "exam_date": "4 May 2027", "stream": "Medical", "is_featured": True, "mode": "Offline", "frequency": "Once a year", "application_fee": "₹1,700", "official_site": "neet.nta.nic.in", "duration_minutes": 200, "sections": ["Physics", "Chemistry", "Botany", "Zoology"]},
    {"slug": "cuet", "name": "CUET UG", "conducting_body": "NTA", "level": ExamLevel.NATIONAL, "description": "Common University Entrance Test for undergraduate admissions to central universities and affiliated institutions.", "registration_closes": "26 Mar 2027", "exam_date": "May 2027", "stream": "Arts", "is_featured": False, "mode": "Online", "frequency": "Once a year", "application_fee": "₹750", "official_site": "cuet.samarth.ac.in", "duration_minutes": 195, "sections": ["Language", "Domain Subjects", "General Test"]},
]


# ─────────────────────────────────────────────────────────────────────────────
# LOCATIONS
# ─────────────────────────────────────────────────────────────────────────────

LOCATIONS = [
    {"slug": "bangalore", "name": "Bangalore", "state": "Karnataka", "college_count": 214},
    {"slug": "hyderabad", "name": "Hyderabad", "state": "Telangana", "college_count": 156},
    {"slug": "pune", "name": "Pune", "state": "Maharashtra", "college_count": 189},
    {"slug": "mumbai", "name": "Mumbai", "state": "Maharashtra", "college_count": 241},
    {"slug": "delhi-ncr", "name": "Delhi NCR", "state": "Delhi", "college_count": 302},
    {"slug": "chennai", "name": "Chennai", "state": "Tamil Nadu", "college_count": 167},
]


# ─────────────────────────────────────────────────────────────────────────────
# ARTICLES  (with body text matching articles-data.ts)
# ─────────────────────────────────────────────────────────────────────────────

ARTICLES = [
    {
        "slug": "mba-admission-process-2026",
        "title": "MBA Admission Process 2026: Dates, Rounds & What's Changed",
        "excerpt": "Every stage of the 2026 MBA admission cycle — entrance windows, shortlisting, interviews and the two changes worth planning around.",
        "author": "Editorial Desk",
        "category": "Admissions",
        "read_minutes": 7,
        "body": (
            "The 2026 MBA admission cycle runs on much the same calendar as last year, with one meaningful change: "
            "most private institutes have pulled their final shortlist dates forward by roughly two weeks, which "
            "compresses the gap between results and interviews.\n\n"
            "There are four stages to plan around. The entrance window, where you register and sit CAT, XAT, NMAT "
            "or an institute test. Shortlisting, where each college applies its own percentile cut and profile "
            "weighting. The personal interview and written ability round. And finally the offer and fee-confirmation "
            "window, which is shorter than most candidates expect.\n\n"
            "The practical consequence of the compressed calendar is that document preparation cannot wait until "
            "after results. Transcripts, work-experience letters and category certificates should be collected "
            "before the entrance window closes, because the gap that used to absorb that work has largely gone.\n\n"
            "The second change is in how work experience is weighted. Several institutes have moved from a flat "
            "band to a sliding scale, which slightly favours candidates with 24 to 48 months over both fresher "
            "and long-tenure profiles."
        ),
        "related_college_slugs": "bengaluru-institute-of-management-studies,eastwind-institute-of-management",
        "published_at": date(2026, 8, 9),
        "is_published": True,
    },
    {
        "slug": "top-mba-placement-report-2026",
        "title": "MBA Placements 2026: Final Placement Report of Top Colleges",
        "excerpt": "Average and median packages across ranked B-schools, and why the median is the number worth reading.",
        "author": "Editorial Desk",
        "category": "Placements",
        "read_minutes": 6,
        "body": (
            "The 2026 final placement season closed with the median package across the top 50 ranked B-schools "
            "sitting at roughly ₹12.4 LPA — up from ₹11.6 LPA last year. The average is higher, as it always "
            "is, at ₹14.8 LPA, but the gap between the two is the more informative number.\n\n"
            "A placement report where the median and the average are close together is a report where the "
            "distribution is roughly even — most graduates end up near the centre. A wide gap means a small "
            "number of very high packages are pulling the average up while most of the batch lands well below "
            "it. That is the case at several institutes where the highest package this year reached ₹50 LPA or "
            "above: impressive, but not a figure the 90th percentile of the batch will see.\n\n"
            "Eastwind Institute of Management topped this year's table for consulting placements, with three "
            "of the top five global consulting firms recruiting on campus. Meridian School of Business led "
            "for financial services. BIMS continued its strong placement record across the board."
        ),
        "related_college_slugs": "eastwind-institute-of-management,bengaluru-institute-of-management-studies,meridian-school-of-business",
        "published_at": date(2026, 8, 5),
        "is_published": True,
    },
    {
        "slug": "executive-mba-eligibility-explained",
        "title": "Executive MBA Eligibility: Who Can Apply and When",
        "excerpt": "Executive MBA programmes accept candidates with a minimum of two years' work experience — but the details vary more than the brochures suggest.",
        "author": "Editorial Desk",
        "category": "Admissions",
        "read_minutes": 5,
        "body": (
            "Executive MBA programmes are built for working professionals, and the eligibility criteria reflect "
            "that. The floor is almost always two years of full-time work experience after graduation, but "
            "how institutes count that experience — and which roles qualify — varies enough to matter.\n\n"
            "Most institutes count experience from the date of the first full-time role, not from graduation. "
            "Internships do not count. Part-time or freelance work usually does not count unless it was "
            "your primary income. A year spent abroad in a role your current employer does not recognise as "
            "employment may not count either — worth clarifying directly before applying.\n\n"
            "The score requirement is typically lower than for the full-time programme at the same institute. "
            "A CAT score in the 70th percentile that would not reach the full-time shortlist may still reach "
            "the executive shortlist, where the overall profile — sector, responsibility, trajectory — "
            "carries more weight than it does for a fresher application."
        ),
        "related_college_slugs": "bengaluru-institute-of-management-studies,meridian-school-of-business,ashwattha-business-school",
        "published_at": date(2026, 8, 3),
        "is_published": True,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# PROGRAMS
# ─────────────────────────────────────────────────────────────────────────────

PROGRAMS = [
    {"slug": "ms-data-analytics", "name": "MS in Data Analytics", "university_name": "Clark University", "university_slug": "clark-university", "online_duration": "8 months", "online_fees": "INR 4,00,000", "online_fees_note": "(including taxes)", "on_campus_duration": "1 year", "on_campus_fees": "USD 17,000 (indicative)", "is_recommended": True},
    {"slug": "ms-business-analytics", "name": "MS in Business Analytics", "university_name": "Eastwind Institute of Management", "university_slug": "eastwind-institute-of-management", "online_duration": "10 months", "online_fees": "INR 5,20,000", "online_fees_note": "(including taxes)", "on_campus_duration": "18 months", "on_campus_fees": "USD 21,500 (indicative)", "is_recommended": True},
    {"slug": "pg-diploma-management", "name": "PG Diploma in Management", "university_name": "Horizon School of Business", "university_slug": "horizon-school-of-business", "online_duration": "12 months", "online_fees": "INR 3,60,000", "online_fees_note": "(including taxes)", "on_campus_duration": "2 years", "on_campus_fees": "USD 14,000 (indicative)", "is_recommended": True},
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
        await session.flush()

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
        session.add(Article(id=uuid.uuid4(), **data))
    await session.commit()
    print(f"  ✓ {len(ARTICLES)} articles seeded")


async def _seed_programs(session: AsyncSession) -> None:
    print("Seeding programs …")
    for data in PROGRAMS:
        session.add(Program(id=uuid.uuid4(), **data))
    await session.commit()
    print(f"  ✓ {len(PROGRAMS)} programs seeded")


async def _sync_meilisearch(session: AsyncSession) -> None:
    try:
        import meilisearch  # type: ignore
        from sqlalchemy import select

        client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_API_KEY)

        colleges = (await session.execute(select(College))).scalars().all()
        client.index("colleges").add_documents([
            {"id": str(c.id), "slug": c.slug, "name": c.name, "city": c.city,
             "state": c.state, "stream": c.stream, "about": c.about or ""}
            for c in colleges
        ])

        exams = (await session.execute(select(Exam))).scalars().all()
        client.index("exams").add_documents([
            {"id": str(e.id), "slug": e.slug, "name": e.name,
             "conductingBody": e.conducting_body, "description": e.description}
            for e in exams
        ])

        locs = (await session.execute(select(Location))).scalars().all()
        client.index("locations").add_documents([
            {"id": str(l.id), "slug": l.slug, "name": l.name, "state": l.state}
            for l in locs
        ])

        print("  ✓ Meilisearch indexes synced")
    except Exception as e:
        print(f"  ⚠  Meilisearch sync skipped ({e})")


async def _seed_admin(session: AsyncSession) -> None:
    """Create the ADMIN user from ADMIN_EMAIL / ADMIN_PASSWORD (env only).

    Credentials are never hardcoded. Skipped when either variable is unset, and
    an existing account with the same email is left untouched.
    """
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not email or not password:
        print("Admin user: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to create one)")
        return

    from sqlalchemy import select

    existing = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing:
        print(f"Admin user: {email} already exists, left unchanged")
        return

    session.add(User(
        id=uuid.uuid4(),
        name=os.environ.get("ADMIN_NAME", "Admin"),
        email=email,
        password_hash=hash_password(password),
        role=UserRole.ADMIN,
        is_verified=True,
    ))
    await session.commit()
    print(f"  ✓ admin user {email} created")


async def main() -> None:
    async with SessionLocal() as session:
        await _seed_colleges(session)
        await _seed_exams(session)
        await _seed_locations(session)
        await _seed_articles(session)
        await _seed_programs(session)
        await _seed_courses(session)
        await _seed_rankings(session)
        await _seed_admin(session)
        await _sync_meilisearch(session)
    await engine.dispose()
    print("\nSeed complete.")



# ─────────────────────────────────────────────────────────────────────────────
# COURSE CATALOGUE  (from frontend/src/lib/mock-data.ts courses[])
# ─────────────────────────────────────────────────────────────────────────────

COURSES_CATALOGUE = [
    {
        "slug": "mba",
        "name": "MBA",
        "full_name": "Master of Business Administration",
        "level": "PG",
        "stream": "Management",
        "duration": "24 Months",
        "modes": ["Full Time", "Part Time", "Online", "Distance"],
        "eligibility": "Bachelor's degree with 50% aggregate (45% for reserved categories).",
        "average_fees": "₹4L - 25L",
        "exams_accepted": ["CAT", "XAT", "CMAT", "NMAT", "MAH MBA CET"],
        "college_count": 4172,
        "about": "A two-year postgraduate management degree covering finance, marketing, operations and strategy, with specialisation electives in the second year.",
        "specialisations": [
            {"slug": "mba-finance", "name": "Finance", "duration": "24 Months", "average_fees": "₹6L - 24L", "college_count": 1840, "about": "Corporate finance, investment banking, valuation and financial modelling."},
            {"slug": "mba-marketing", "name": "Marketing", "duration": "24 Months", "average_fees": "₹5.5L - 22L", "college_count": 1795, "about": "Brand management, consumer behaviour, digital marketing and sales strategy."},
            {"slug": "mba-business-analytics", "name": "Business Analytics", "duration": "24 Months", "average_fees": "₹6L - 22L", "college_count": 1240, "about": "Data analytics, business intelligence and quantitative decision-making applied to management."},
            {"slug": "mba-hr", "name": "Human Resources", "duration": "24 Months", "average_fees": "₹5L - 20L", "college_count": 1580, "about": "Talent acquisition, performance management, labour relations and organisational behaviour."},
        ],
    },
    {
        "slug": "bba",
        "name": "BBA",
        "full_name": "Bachelor of Business Administration",
        "level": "UG",
        "stream": "Management",
        "duration": "36 Months",
        "modes": ["Full Time", "Online"],
        "eligibility": "10+2 in any stream with 50% aggregate.",
        "average_fees": "₹1.5L - 8L",
        "exams_accepted": ["IPMAT", "SET", "NPAT"],
        "college_count": 2860,
        "about": "An undergraduate management degree covering business fundamentals, commonly taken before an MBA or a role in operations and sales.",
        "specialisations": [],
    },
    {
        "slug": "b-tech",
        "name": "B.Tech",
        "full_name": "Bachelor of Technology",
        "level": "UG",
        "stream": "Engineering",
        "duration": "48 Months",
        "modes": ["Full Time"],
        "eligibility": "10+2 with Physics, Chemistry and Mathematics, 60% aggregate.",
        "average_fees": "₹3L - 16L",
        "exams_accepted": ["JEE Main", "JEE Advanced", "BITSAT", "VITEEE"],
        "college_count": 3860,
        "about": "A four-year engineering degree with branch specialisation from the first or second year, and a mandatory final-year project.",
        "specialisations": [
            {"slug": "b-tech-computer-science", "name": "Computer Science", "duration": "48 Months", "average_fees": "₹4L - 16L", "college_count": 2840, "about": "Algorithms, data structures, operating systems, networks and software engineering."},
            {"slug": "b-tech-electronics", "name": "Electronics & Communication", "duration": "48 Months", "average_fees": "₹3L - 14L", "college_count": 2210, "about": "Analog and digital circuits, signal processing, VLSI design and embedded systems."},
            {"slug": "b-tech-mechanical", "name": "Mechanical Engineering", "duration": "48 Months", "average_fees": "₹3L - 12L", "college_count": 2640, "about": "Thermodynamics, fluid mechanics, design, manufacturing and automotive systems."},
        ],
    },
    {
        "slug": "m-tech",
        "name": "M.Tech",
        "full_name": "Master of Technology",
        "level": "PG",
        "stream": "Engineering",
        "duration": "24 Months",
        "modes": ["Full Time", "Part Time"],
        "eligibility": "B.Tech or B.E. with 60% aggregate and a valid GATE score.",
        "average_fees": "₹2L - 9L",
        "exams_accepted": ["GATE", "Karnataka PGCET"],
        "college_count": 1420,
        "about": "A two-year postgraduate engineering degree focused on research and advanced specialisation within a branch.",
        "specialisations": [],
    },
    {
        "slug": "mbbs",
        "name": "MBBS",
        "full_name": "Bachelor of Medicine, Bachelor of Surgery",
        "level": "UG",
        "stream": "Medical",
        "duration": "66 Months",
        "modes": ["Full Time"],
        "eligibility": "10+2 with Physics, Chemistry and Biology, 50% aggregate.",
        "average_fees": "₹5L - 60L",
        "exams_accepted": ["NEET UG"],
        "college_count": 706,
        "about": "India's primary undergraduate medical degree, including a compulsory rotating internship in the final year.",
        "specialisations": [],
    },
    {
        "slug": "llb",
        "name": "LLB",
        "full_name": "Bachelor of Laws",
        "level": "UG",
        "stream": "Law",
        "duration": "36 Months",
        "modes": ["Full Time"],
        "eligibility": "Bachelor's degree in any discipline with 45% aggregate.",
        "average_fees": "₹1L - 12L",
        "exams_accepted": ["CLAT", "AILET", "LSAT India"],
        "college_count": 640,
        "about": "A three-year law degree for graduates, leading to enrolment with a state bar council on completion.",
        "specialisations": [],
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# RANKING LISTS
# ─────────────────────────────────────────────────────────────────────────────

RANKING_LISTS = [
    {
        "slug": "management-nirf",
        "name": "NIRF Management Rankings 2026",
        "authority": "NIRF",
        "year": 2026,
        "stream": "Management",
        "entries": [
            {"college_slug": "eastwind-institute-of-management", "rank": 1, "score": "72.4"},
            {"college_slug": "meridian-school-of-business", "rank": 2, "score": "69.1"},
            {"college_slug": "bengaluru-institute-of-management-studies", "rank": 3, "score": "65.8"},
            {"college_slug": "ashwattha-business-school", "rank": 4, "score": "62.3"},
            {"college_slug": "vantage-school-of-management", "rank": 5, "score": "60.7"},
            {"college_slug": "sahyadri-institute-of-management", "rank": 6, "score": "58.9"},
            {"college_slug": "horizon-school-of-business", "rank": 7, "score": "56.2"},
            {"college_slug": "kr-mangalam-university", "rank": 8, "score": "53.4"},
        ],
    },
    {
        "slug": "engineering-nirf",
        "name": "NIRF Engineering Rankings 2026",
        "authority": "NIRF",
        "year": 2026,
        "stream": "Engineering",
        "entries": [
            {"college_slug": "kaveri-institute-of-technology", "rank": 1, "score": "68.9"},
            {"college_slug": "cascade-institute-of-technology", "rank": 2, "score": "64.2"},
            {"college_slug": "northgate-college-of-engineering", "rank": 3, "score": "61.5"},
        ],
    },
    {
        "slug": "medical-nirf",
        "name": "NIRF Medical Rankings 2026",
        "authority": "NIRF",
        "year": 2026,
        "stream": "Medical",
        "entries": [
            {"college_slug": "sanjeevani-medical-college", "rank": 1, "score": "74.1"},
            {"college_slug": "meridian-institute-of-medical-sciences", "rank": 2, "score": "69.8"},
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Seed helpers — courses + rankings
# ─────────────────────────────────────────────────────────────────────────────

async def _seed_courses(session: AsyncSession) -> None:
    print("Seeding course catalogue …")
    for data in COURSES_CATALOGUE:
        specs_data = data.pop("specialisations", [])
        course = CourseCatalogue(id=uuid.uuid4(), **data)
        session.add(course)
        await session.flush()

        for s in specs_data:
            session.add(Specialisation(
                id=uuid.uuid4(),
                course_id=course.id,
                course_slug=course.slug,
                course_name=course.name,
                stream=course.stream,
                **s,
            ))

    await session.commit()
    print(f"  ✓ {len(COURSES_CATALOGUE)} courses seeded")


async def _seed_rankings(session: AsyncSession) -> None:
    print("Seeding ranking lists …")
    for data in RANKING_LISTS:
        entries_data = data.pop("entries", [])
        ranking = RankingList(id=uuid.uuid4(), **data)
        session.add(ranking)
        await session.flush()

        for e in entries_data:
            session.add(RankingEntry(id=uuid.uuid4(), ranking_list_id=ranking.id, **e))

    await session.commit()
    print(f"  ✓ {len(RANKING_LISTS)} ranking lists seeded")


if __name__ == "__main__":
    asyncio.run(main())
