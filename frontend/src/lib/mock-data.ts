// Placeholder content for UI development only — replaced by real API data once
// the backend's College/Course/Exam endpoints exist (see backend/models).

export type College = {
  slug: string;
  name: string;
  city: string;
  state: string;
  ownership: "Private" | "Government" | "Deemed";
  stream: string;
  ranking: { authority: string; rank: number };
  rating: number;
  reviewCount: number;
  coursesOffered: number;
  feesRange: string;
  examsAccepted: string[];
  tags: string[];
  approvals: string[];
  established: number;
  about: string;
  ratingBreakdown: { label: string; score: number }[];
  courses: {
    name: string;
    duration: string;
    mode: string;
    fees: string;
    exams: string[];
  }[];
  placement: { year: number; average: string; median: string; highest: string; topRecruiters: string[] };
  cutoffs: { exam: string; category: string; score: string }[];
  reviews: {
    author: string;
    course: string;
    batch: string;
    verified: boolean;
    date: string;
    rating: number;
    body: string;
  }[];
};

export const colleges: College[] = [
  {
    slug: "bengaluru-institute-of-management-studies",
    name: "Bengaluru Institute of Management Studies",
    city: "Bengaluru",
    state: "Karnataka",
    ownership: "Private",
    stream: "Management",
    ranking: { authority: "NIRF", rank: 34 },
    rating: 4.4,
    reviewCount: 612,
    coursesOffered: 6,
    feesRange: "₹9.5L - 21L",
    examsAccepted: ["CAT", "XAT", "GMAT"],
    tags: ["Top Placements", "Featured"],
    approvals: ["AICTE", "NAAC A++"],
    established: 1998,
    about:
      "Bengaluru Institute of Management Studies (BIMS) is a private business school offering full-time MBA, executive MBA and doctoral programmes, with a placement record consistently ranked among the top private B-schools in South India.",
    ratingBreakdown: [
      { label: "Placements", score: 4.6 },
      { label: "Faculty", score: 4.3 },
      { label: "Infrastructure", score: 4.5 },
      { label: "Campus Life", score: 4.2 },
    ],
    courses: [
      {
        name: "MBA",
        duration: "24 Months",
        mode: "Full Time",
        fees: "₹18.4L Total Fees",
        exams: ["CAT", "XAT", "GMAT"],
      },
      {
        name: "Executive MBA",
        duration: "15 Months",
        mode: "Weekend",
        fees: "₹12.6L Total Fees",
        exams: ["CAT", "GMAT"],
      },
      {
        name: "Ph.D. Management",
        duration: "36 Months",
        mode: "Full Time",
        fees: "₹4.1L Total Fees",
        exams: ["Institute Entrance Test"],
      },
    ],
    placement: {
      year: 2025,
      average: "₹14.2 LPA",
      median: "₹12.8 LPA",
      highest: "₹42 LPA",
      topRecruiters: ["Deloitte", "Amazon", "TCS", "Axis Bank", "Flipkart"],
    },
    cutoffs: [
      { exam: "CAT", category: "General", score: "92 percentile" },
      { exam: "CAT", category: "OBC", score: "85 percentile" },
      { exam: "XAT", category: "General", score: "88 percentile" },
    ],
    reviews: [
      {
        author: "Komal Mehra",
        course: "MBA",
        batch: "2022–24",
        verified: true,
        date: "3 Sep 2025",
        rating: 4.6,
        body: "Placements were strong this year — around 90% of the batch placed before graduation, with the highest package touching ₹42 LPA. Faculty in the finance electives were particularly good.",
      },
      {
        author: "Arjun Rao",
        course: "Executive MBA",
        batch: "2023–24",
        verified: true,
        date: "18 Jul 2025",
        rating: 4.2,
        body: "Weekend batch worked well alongside my job. Campus infrastructure has improved a lot since the new block opened last year.",
      },
    ],
  },
  {
    slug: "horizon-school-of-business",
    name: "Horizon School of Business",
    city: "Hyderabad",
    state: "Telangana",
    ownership: "Private",
    stream: "Management",
    ranking: { authority: "NIRF", rank: 41 },
    rating: 4.1,
    reviewCount: 348,
    coursesOffered: 5,
    feesRange: "₹6.5L - 14L",
    examsAccepted: ["CAT", "MAT", "CMAT"],
    tags: ["Top Rated"],
    approvals: ["AICTE"],
    established: 2004,
    about:
      "Horizon School of Business runs full-time and online MBA programmes with a focus on analytics and digital marketing specialisations.",
    ratingBreakdown: [
      { label: "Placements", score: 4.0 },
      { label: "Faculty", score: 4.2 },
      { label: "Infrastructure", score: 3.9 },
      { label: "Campus Life", score: 4.1 },
    ],
    courses: [
      { name: "MBA", duration: "24 Months", mode: "Full Time", fees: "₹11.2L Total Fees", exams: ["CAT", "MAT"] },
      { name: "MBA (Online)", duration: "24 Months", mode: "Online", fees: "₹4.3L Total Fees", exams: ["CMAT"] },
    ],
    placement: {
      year: 2025,
      average: "₹9.8 LPA",
      median: "₹8.5 LPA",
      highest: "₹24 LPA",
      topRecruiters: ["Wipro", "ICICI Bank", "Byju's", "Cognizant"],
    },
    cutoffs: [{ exam: "CAT", category: "General", score: "78 percentile" }],
    reviews: [
      {
        author: "Sneha Patil",
        course: "MBA",
        batch: "2021–23",
        verified: true,
        date: "2 Feb 2025",
        rating: 4.0,
        body: "Good faculty for marketing specialisation. Placement cell could follow up faster with smaller recruiters.",
      },
    ],
  },
  {
    slug: "eastwind-institute-of-management",
    name: "Eastwind Institute of Management",
    city: "Pune",
    state: "Maharashtra",
    ownership: "Deemed",
    stream: "Management",
    ranking: { authority: "NIRF", rank: 22 },
    rating: 4.6,
    reviewCount: 890,
    coursesOffered: 8,
    feesRange: "₹15L - 24L",
    examsAccepted: ["CAT", "XAT", "GMAT", "NMAT"],
    tags: ["Top Placements", "Featured"],
    approvals: ["AICTE", "NAAC A++", "UGC"],
    established: 1985,
    about:
      "Eastwind Institute of Management is a deemed university with one of the oldest MBA programmes in Western India, recognised for its finance and consulting placement tracks.",
    ratingBreakdown: [
      { label: "Placements", score: 4.8 },
      { label: "Faculty", score: 4.6 },
      { label: "Infrastructure", score: 4.5 },
      { label: "Campus Life", score: 4.4 },
    ],
    courses: [
      { name: "MBA", duration: "24 Months", mode: "Full Time", fees: "₹21.8L Total Fees", exams: ["CAT", "XAT", "GMAT"] },
      { name: "MBA Business Analytics", duration: "24 Months", mode: "Full Time", fees: "₹19.5L Total Fees", exams: ["CAT", "NMAT"] },
    ],
    placement: {
      year: 2025,
      average: "₹19.6 LPA",
      median: "₹17.2 LPA",
      highest: "₹58 LPA",
      topRecruiters: ["Goldman Sachs", "McKinsey & Company", "Amazon", "BCG"],
    },
    cutoffs: [
      { exam: "CAT", category: "General", score: "97 percentile" },
      { exam: "XAT", category: "General", score: "94 percentile" },
    ],
    reviews: [
      {
        author: "Rahul Nair",
        course: "MBA",
        batch: "2022–24",
        verified: true,
        date: "11 Jun 2025",
        rating: 4.7,
        body: "Consulting placements are the strongest track here — three of the top five global firms recruited on campus this year.",
      },
    ],
  },
];

export type Exam = {
  slug: string;
  name: string;
  conductingBody: string;
  level: "National" | "State";
  description: string;
  registrationCloses: string;
  examDate: string;
};

export const exams: Exam[] = [
  {
    slug: "cat",
    name: "Common Admission Test (CAT)",
    conductingBody: "IIM",
    level: "National",
    description: "A national-level MBA entrance test conducted for admission into IIMs and 1000+ B-schools across India.",
    registrationCloses: "20 Sep 2026",
    examDate: "29 Nov 2026",
  },
  {
    slug: "xat",
    name: "Xavier Aptitude Test (XAT)",
    conductingBody: "XLRI Jamshedpur",
    level: "National",
    description: "Entrance exam for XLRI and 150+ other MBA institutes, known for its decision-making section.",
    registrationCloses: "30 Nov 2026",
    examDate: "4 Jan 2027",
  },
  {
    slug: "karnataka-pgcet",
    name: "Karnataka PGCET",
    conductingBody: "KEA",
    level: "State",
    description: "State-level entrance test for MBA/MCA/M.Tech admissions into Karnataka's private and government colleges.",
    registrationCloses: "15 May 2026",
    examDate: "6 Jun 2026",
  },
  {
    slug: "nmat",
    name: "NMAT by GMAC",
    conductingBody: "GMAC",
    level: "National",
    description: "Multi-attempt MBA entrance test accepted by NMIMS, SPJIMR and 60+ leading business schools.",
    registrationCloses: "10 Oct 2026",
    examDate: "5 Nov 2026",
  },
  {
    slug: "cmat",
    name: "Common Management Admission Test (CMAT)",
    conductingBody: "NTA",
    level: "National",
    description: "NTA-conducted national test for AICTE-approved MBA and PGDM programmes across India.",
    registrationCloses: "25 Dec 2026",
    examDate: "28 Jan 2027",
  },
  {
    slug: "mah-cet",
    name: "MAH MBA CET",
    conductingBody: "Maharashtra CET Cell",
    level: "State",
    description: "State entrance test for MBA and MMS seats in Maharashtra's government and private institutes.",
    registrationCloses: "20 Feb 2027",
    examDate: "12 Mar 2027",
  },
];

export type RecommendedProgram = {
  slug: string;
  name: string;
  university: string;
  universitySlug: string;
  online: { duration: string; fees: string; feesNote: string };
  onCampus: { duration: string; fees: string };
};

export const recommendedPrograms: RecommendedProgram[] = [
  {
    slug: "ms-data-analytics",
    name: "MS in Data Analytics",
    university: "Clark University",
    universitySlug: "clark-university",
    online: { duration: "8 months", fees: "INR 4,00,000", feesNote: "(including taxes)" },
    onCampus: { duration: "1 year", fees: "USD 17,000 (indicative)" },
  },
  {
    slug: "ms-business-analytics",
    name: "MS in Business Analytics",
    university: "Eastwind Institute of Management",
    universitySlug: "eastwind-institute-of-management",
    online: { duration: "10 months", fees: "INR 5,20,000", feesNote: "(including taxes)" },
    onCampus: { duration: "18 months", fees: "USD 21,500 (indicative)" },
  },
  {
    slug: "pg-diploma-management",
    name: "PG Diploma in Management",
    university: "Horizon School of Business",
    universitySlug: "horizon-school-of-business",
    online: { duration: "12 months", fees: "INR 3,60,000", feesNote: "(including taxes)" },
    onCampus: { duration: "2 years", fees: "USD 14,000 (indicative)" },
  },
];

export type CareerPanel = {
  title: string;
  viewAllHref: string;
  links: { label: string; href: string }[];
};

export const careerPanels: CareerPanel[] = [
  {
    title: "Featured Classes",
    viewAllHref: "/classes",
    links: [
      { label: "Paul University", href: "/college/paul-university" },
      { label: "K. R. Mangalam University", href: "/college/kr-mangalam-university" },
      { label: "Swarnam Startup and Innovation University", href: "/college/swarnam-university" },
      { label: "Science", href: "/science/colleges" },
      { label: "Arts", href: "/arts/colleges" },
      { label: "Commerce", href: "/commerce/colleges" },
      { label: "Pharmacy", href: "/pharmacy/colleges" },
      { label: "Law", href: "/law/colleges" },
      { label: "Paramedical", href: "/paramedical/colleges" },
    ],
  },
  {
    title: "Important Exams",
    viewAllHref: "/exams",
    links: [
      { label: "JEE Main", href: "/exams/jee-main" },
      { label: "JEE Advanced", href: "/exams/jee-advanced" },
      { label: "TS EAMCET", href: "/exams/ts-eamcet" },
      { label: "WBJEE", href: "/exams/wbjee" },
      { label: "VITEEE", href: "/exams/viteee" },
    ],
  },
  {
    title: "Top Cities",
    viewAllHref: "/locations",
    links: [
      { label: "Maharashtra", href: "/location/maharashtra" },
      { label: "Tamil Nadu", href: "/location/tamil-nadu" },
      { label: "Uttar Pradesh", href: "/location/uttar-pradesh" },
      { label: "Karnataka", href: "/location/karnataka" },
      { label: "Rajasthan", href: "/location/rajasthan" },
    ],
  },
  {
    title: "Related Courses",
    viewAllHref: "/courses",
    links: [
      { label: "B. Tech", href: "/courses/b-tech" },
      { label: "M. Tech", href: "/courses/m-tech" },
      { label: "Bachelor of Engineering", href: "/courses/be" },
      { label: "Civil Engineering", href: "/courses/civil-engineering" },
      { label: "Mechanical Engineering", href: "/courses/mechanical-engineering" },
      { label: "Automobile Engineering", href: "/courses/automobile-engineering" },
      { label: "Aerospace Engineering", href: "/courses/aerospace-engineering" },
    ],
  },
];

export const recommendedUniversities = [
  { slug: "clark-university", name: "Clark University", city: "Meerut", state: "Uttar Pradesh" },
  { slug: "kr-mangalam-university", name: "K. R. Mangalam University", city: "Gurugram", state: "Haryana" },
  { slug: "swarnam-university", name: "Swarnam Innovation University", city: "Indore", state: "Madhya Pradesh" },
];

export type DataHighlight = {
  slug: string;
  title: string;
  description: string;
  links: { label: string; href: string }[];
};

export const dataHighlights: DataHighlight[] = [
  {
    slug: "college-by-ranking",
    title: "College By Ranking",
    description:
      "Compare institutes side by side on NIRF rank, accreditation and placement record before you shortlist.",
    links: [
      { label: "Top Engineering Colleges", href: "/engineering/colleges" },
      { label: "Top Medicine Colleges", href: "/medical/colleges" },
      { label: "Top Law Colleges", href: "/law/colleges" },
      { label: "see more", href: "/colleges" },
    ],
  },
  {
    slug: "exam",
    title: "Exam",
    description:
      "Track registration windows, exam dates, cutoffs and answer keys for every entrance test in one place.",
    links: [
      { label: "Top Engineering Exams", href: "/engineering/exams" },
      { label: "Top Medicine Exams", href: "/medical/exams" },
      { label: "Top Law Exams", href: "/law/exams" },
      { label: "see more", href: "/exams" },
    ],
  },
  {
    slug: "college-predictors",
    title: "College Predictors",
    description:
      "Enter your score and category to see the colleges realistically within reach this admission cycle.",
    links: [
      { label: "Top Engineering Colleges", href: "/engineering/colleges" },
      { label: "Top Medicine Colleges", href: "/medical/colleges" },
      { label: "Top Law Colleges", href: "/law/colleges" },
      { label: "see more", href: "/predictors" },
    ],
  },
  {
    slug: "rank-predictors",
    title: "Rank Predictors",
    description:
      "Turn a raw or percentile score into an expected rank using past years' normalisation data.",
    links: [
      { label: "Top Engineering Colleges", href: "/engineering/colleges" },
      { label: "Top Medicine Colleges", href: "/medical/colleges" },
      { label: "Top Law Colleges", href: "/law/colleges" },
      { label: "see more", href: "/predictors" },
    ],
  },
];

export const locations = [
  { slug: "bangalore", name: "Bangalore", collegeCount: 214 },
  { slug: "hyderabad", name: "Hyderabad", collegeCount: 156 },
  { slug: "pune", name: "Pune", collegeCount: 189 },
  { slug: "mumbai", name: "Mumbai", collegeCount: 241 },
  { slug: "delhi-ncr", name: "Delhi NCR", collegeCount: 302 },
  { slug: "chennai", name: "Chennai", collegeCount: 167 },
];

export const articles = [
  {
    slug: "mba-admission-process-2026",
    title: "MBA Admission Process 2026: Dates, Rounds & What's Changed",
    excerpt: "PGDPM 2026 for working professionals will be held on 2 and 9 September...",
    date: "9 Aug 2026",
  },
  {
    slug: "top-mba-placement-report-2026",
    title: "MBA Placements 2026: Final Placement Report of Top Colleges",
    excerpt: "The average and median package placed during the 2026 batch across ranked B-schools...",
    date: "5 Aug 2026",
  },
  {
    slug: "executive-mba-eligibility-explained",
    title: "Executive MBA Eligibility: Who Can Apply and When",
    excerpt: "Executive MBA programmes accept candidates with a minimum of two years' work experience...",
    date: "3 Aug 2026",
  },
];

export const faqs = [
  {
    question: "What is the eligibility criteria for pursuing an MBA?",
    answer:
      "For most full-time MBA programmes, candidates need a bachelor's degree with at least 50% aggregate marks (45% for reserved categories) from a recognised university, along with a valid CAT, XAT, GMAT or equivalent score.",
  },
  {
    question: "What are the best government MBA colleges in India?",
    answer:
      "Government-run and centrally funded MBA programmes are offered through the IIMs, FMS Delhi, and several state-run university departments, each with its own entrance exam and cutoff.",
  },
  {
    question: "How much does an MBA typically cost in India?",
    answer:
      "Total fees range from roughly ₹2L at government institutes to ₹25L+ at top private and deemed universities, depending on ranking, mode of study, and specialisation.",
  },
];
