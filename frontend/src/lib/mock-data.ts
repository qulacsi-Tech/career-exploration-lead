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
  /* Admin-only detail. Optional so the public pages that only read the fields
     above keep compiling; they are edited on the exam record. */
  mode?: "Online" | "Offline" | "Hybrid";
  frequency?: string;
  applicationFee?: string;
  officialSite?: string;
  durationMinutes?: number;
  sections?: string[];
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
    mode: "Online",
    frequency: "Once a year",
    applicationFee: "₹2,400",
    officialSite: "iimcat.ac.in",
    durationMinutes: 120,
    sections: ["VARC", "DILR", "QA"],
  },
  {
    slug: "xat",
    name: "Xavier Aptitude Test (XAT)",
    conductingBody: "XLRI Jamshedpur",
    level: "National",
    description: "Entrance exam for XLRI and 150+ other MBA institutes, known for its decision-making section.",
    registrationCloses: "30 Nov 2026",
    examDate: "4 Jan 2027",
    mode: "Online",
    frequency: "Once a year",
    applicationFee: "₹2,200",
    officialSite: "xatonline.in",
    durationMinutes: 210,
    sections: ["VALR", "DM", "QA & DI", "GK"],
  },
  {
    slug: "karnataka-pgcet",
    name: "Karnataka PGCET",
    conductingBody: "KEA",
    level: "State",
    description: "State-level entrance test for MBA/MCA/M.Tech admissions into Karnataka's private and government colleges.",
    registrationCloses: "15 May 2026",
    examDate: "6 Jun 2026",
    mode: "Offline",
    frequency: "Once a year",
    applicationFee: "₹800",
    officialSite: "cetonline.karnataka.gov.in",
    durationMinutes: 150,
    sections: ["Proficiency", "General Knowledge"],
  },
  {
    slug: "nmat",
    name: "NMAT by GMAC",
    conductingBody: "GMAC",
    level: "National",
    description: "Multi-attempt MBA entrance test accepted by NMIMS, SPJIMR and 60+ leading business schools.",
    registrationCloses: "10 Oct 2026",
    examDate: "5 Nov 2026",
    mode: "Online",
    frequency: "Multiple attempts",
    applicationFee: "₹2,800",
    officialSite: "nmat.org",
    durationMinutes: 120,
    sections: ["Language Skills", "Quantitative Skills", "Logical Reasoning"],
  },
  {
    slug: "cmat",
    name: "Common Management Admission Test (CMAT)",
    conductingBody: "NTA",
    level: "National",
    description: "NTA-conducted national test for AICTE-approved MBA and PGDM programmes across India.",
    registrationCloses: "25 Dec 2026",
    examDate: "28 Jan 2027",
    mode: "Online",
    frequency: "Once a year",
    applicationFee: "₹2,000",
    officialSite: "cmat.nta.nic.in",
    durationMinutes: 180,
    sections: ["Quantitative", "Logical Reasoning", "Language", "General Awareness"],
  },
  {
    slug: "mah-cet",
    name: "MAH MBA CET",
    conductingBody: "Maharashtra CET Cell",
    level: "State",
    description: "State entrance test for MBA and MMS seats in Maharashtra's government and private institutes.",
    registrationCloses: "20 Feb 2027",
    examDate: "12 Mar 2027",
    mode: "Online",
    frequency: "Once a year",
    applicationFee: "₹1,000",
    officialSite: "cetcell.mahacet.org",
    durationMinutes: 150,
    sections: ["Verbal Ability", "Quantitative Aptitude", "Logical Reasoning", "Abstract Reasoning"],
  },
];

export type Course = {
  slug: string;
  name: string;
  fullName: string;
  level: "UG" | "PG" | "Diploma" | "Doctorate";
  stream: string;
  duration: string;
  modes: string[];
  eligibility: string;
  averageFees: string;
  examsAccepted: string[];
  collegeCount: number;
  about: string;
};

export const courses: Course[] = [
  {
    slug: "mba",
    name: "MBA",
    fullName: "Master of Business Administration",
    level: "PG",
    stream: "Management",
    duration: "24 Months",
    modes: ["Full Time", "Part Time", "Online", "Distance"],
    eligibility: "Bachelor's degree with 50% aggregate (45% for reserved categories).",
    averageFees: "₹4L - 25L",
    examsAccepted: ["CAT", "XAT", "CMAT", "NMAT", "MAH MBA CET"],
    collegeCount: 4172,
    about:
      "A two-year postgraduate management degree covering finance, marketing, operations and strategy, with specialisation electives in the second year.",
  },
  {
    slug: "bba",
    name: "BBA",
    fullName: "Bachelor of Business Administration",
    level: "UG",
    stream: "Management",
    duration: "36 Months",
    modes: ["Full Time", "Online"],
    eligibility: "10+2 in any stream with 50% aggregate.",
    averageFees: "₹1.5L - 8L",
    examsAccepted: ["IPMAT", "SET", "NPAT"],
    collegeCount: 2860,
    about:
      "An undergraduate management degree covering business fundamentals, commonly taken before an MBA or a role in operations and sales.",
  },
  {
    slug: "b-tech",
    name: "B.Tech",
    fullName: "Bachelor of Technology",
    level: "UG",
    stream: "Engineering",
    duration: "48 Months",
    modes: ["Full Time"],
    eligibility: "10+2 with Physics, Chemistry and Mathematics, 60% aggregate.",
    averageFees: "₹3L - 16L",
    examsAccepted: ["JEE Main", "JEE Advanced", "BITSAT", "VITEEE"],
    collegeCount: 3860,
    about:
      "A four-year engineering degree with branch specialisation from the first or second year, and a mandatory final-year project.",
  },
  {
    slug: "m-tech",
    name: "M.Tech",
    fullName: "Master of Technology",
    level: "PG",
    stream: "Engineering",
    duration: "24 Months",
    modes: ["Full Time", "Part Time"],
    eligibility: "B.Tech or B.E. with 60% aggregate and a valid GATE score.",
    averageFees: "₹2L - 9L",
    examsAccepted: ["GATE", "Karnataka PGCET"],
    collegeCount: 1420,
    about:
      "A two-year postgraduate engineering degree focused on research and advanced specialisation within a branch.",
  },
  {
    slug: "mbbs",
    name: "MBBS",
    fullName: "Bachelor of Medicine, Bachelor of Surgery",
    level: "UG",
    stream: "Medical",
    duration: "66 Months",
    modes: ["Full Time"],
    eligibility: "10+2 with Physics, Chemistry and Biology, 50% aggregate.",
    averageFees: "₹5L - 60L",
    examsAccepted: ["NEET UG"],
    collegeCount: 706,
    about:
      "India's primary undergraduate medical degree, including a compulsory rotating internship in the final year.",
  },
  {
    slug: "llb",
    name: "LLB",
    fullName: "Bachelor of Laws",
    level: "UG",
    stream: "Law",
    duration: "36 Months",
    modes: ["Full Time"],
    eligibility: "Bachelor's degree in any discipline with 45% aggregate.",
    averageFees: "₹1L - 12L",
    examsAccepted: ["CLAT", "AILET", "LSAT India"],
    collegeCount: 640,
    about:
      "A three-year law degree for graduates, leading to enrolment with a state bar council on completion.",
  },
];

export type Specialisation = {
  slug: string;
  name: string;
  courseSlug: string;
  courseName: string;
  stream: string;
  duration: string;
  averageFees: string;
  collegeCount: number;
  about: string;
};

export const specialisations: Specialisation[] = [
  {
    slug: "mba-finance",
    name: "Finance",
    courseSlug: "mba",
    courseName: "MBA",
    stream: "Management",
    duration: "24 Months",
    averageFees: "₹6L - 24L",
    collegeCount: 1840,
    about: "Corporate finance, investment banking, valuation and financial modelling.",
  },
  {
    slug: "mba-marketing",
    name: "Marketing",
    courseSlug: "mba",
    courseName: "MBA",
    stream: "Management",
    duration: "24 Months",
    averageFees: "₹5.5L - 22L",
    collegeCount: 1795,
    about: "Brand management, consumer behaviour, digital marketing and sales strategy.",
  },
  {
    slug: "mba-business-analytics",
    name: "Business Analytics",
    courseSlug: "mba",
    courseName: "MBA",
    stream: "Management",
    duration: "24 Months",
    averageFees: "₹8L - 26L",
    collegeCount: 612,
    about: "Statistics, data visualisation and decision modelling applied to business problems.",
  },
  {
    slug: "b-tech-computer-science",
    name: "Computer Science",
    courseSlug: "b-tech",
    courseName: "B.Tech",
    stream: "Engineering",
    duration: "48 Months",
    averageFees: "₹4L - 18L",
    collegeCount: 2410,
    about: "Algorithms, systems, databases and software engineering.",
  },
  {
    slug: "b-tech-mechanical",
    name: "Mechanical Engineering",
    courseSlug: "b-tech",
    courseName: "B.Tech",
    stream: "Engineering",
    duration: "48 Months",
    averageFees: "₹2.5L - 12L",
    collegeCount: 1980,
    about: "Thermodynamics, manufacturing, machine design and materials.",
  },
  {
    slug: "llb-corporate-law",
    name: "Corporate Law",
    courseSlug: "llb",
    courseName: "LLB",
    stream: "Law",
    duration: "36 Months",
    averageFees: "₹2L - 14L",
    collegeCount: 320,
    about: "Company law, mergers and acquisitions, securities regulation and compliance.",
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

/**
 * Streams in the homepage's "Explore Your Future" band. Lives here rather than
 * in the page so the admin's Fields tab edits the same list the page renders —
 * a second copy in the component drifts the moment a count changes.
 */
export const homeStreams = [
  { slug: "management", name: "Management", count: 4172 },
  { slug: "engineering", name: "Engineering", count: 3860 },
  { slug: "medical", name: "Medical", count: 2104 },
  { slug: "arts", name: "Arts", count: 1988 },
  { slug: "commerce", name: "Commerce", count: 1520 },
  { slug: "law", name: "Law", count: 640 },
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
