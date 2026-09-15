/**
 * Study Abroad content.
 *
 * ## The figures are indicative, and say so on the page
 *
 * Tuition, living costs and post-study work rules change every intake and
 * differ by state, university and course. Nothing here is scraped from an
 * official source, so every number is written as a range, labelled indicative
 * in the UI, and dated below — a precise-looking "₹24,50,000 tuition" would
 * read as researched fact when it is an editorial estimate.
 *
 * Replace `FIGURES_REVIEWED` and the ranges when the counselling team supplies
 * current numbers; the date is rendered on the page so a stale table is visible
 * to a reader rather than quietly wrong.
 */

export const FIGURES_REVIEWED = "September 2026";

export type Destination = {
  slug: string;
  country: string;
  tagline: string;
  /** Rough count of institutions that admit international students. */
  universities: string;
  /** Annual tuition, indicative range, in INR. */
  tuition: string;
  /** Annual living costs, indicative range, in INR. */
  living: string;
  /** Post-study work rights, as advertised by the destination. */
  postStudyWork: string;
  intakes: string;
  popularCourses: string[];
};

export const destinations: Destination[] = [
  {
    slug: "usa",
    country: "United States",
    tagline: "The widest choice of universities and research funding",
    universities: "4,000+",
    tuition: "₹18L - 45L / year",
    living: "₹9L - 15L / year",
    postStudyWork: "Up to 3 years on OPT for STEM degrees",
    intakes: "Fall (Aug), Spring (Jan)",
    popularCourses: ["Computer Science", "Data Science", "MBA", "Engineering"],
  },
  {
    slug: "uk",
    country: "United Kingdom",
    tagline: "One-year master's degrees and historic institutions",
    universities: "160+",
    tuition: "₹16L - 35L / year",
    living: "₹9L - 14L / year",
    postStudyWork: "2 years on the Graduate Route",
    intakes: "September, January",
    popularCourses: ["Management", "Finance", "Law", "Public Health"],
  },
  {
    slug: "canada",
    country: "Canada",
    tagline: "Affordable tuition with a clear path to residency",
    universities: "100+",
    tuition: "₹12L - 28L / year",
    living: "₹7L - 12L / year",
    postStudyWork: "Up to 3 years on a PGWP",
    intakes: "Fall, Winter, Summer",
    popularCourses: ["Business", "Health Sciences", "IT", "Hospitality"],
  },
  {
    slug: "australia",
    country: "Australia",
    tagline: "Strong research output and generous work rights",
    universities: "40+",
    tuition: "₹14L - 32L / year",
    living: "₹10L - 15L / year",
    postStudyWork: "2 to 4 years, by qualification level",
    intakes: "February, July",
    popularCourses: ["Nursing", "Accounting", "Engineering", "IT"],
  },
  {
    slug: "germany",
    country: "Germany",
    tagline: "Public universities with little or no tuition fee",
    universities: "400+",
    tuition: "₹0 - 6L / year at public universities",
    living: "₹8L - 11L / year",
    postStudyWork: "18 months to find work",
    intakes: "Winter (Oct), Summer (Apr)",
    popularCourses: ["Mechanical Engineering", "Automotive", "Data Science"],
  },
  {
    slug: "ireland",
    country: "Ireland",
    tagline: "European tech and pharma headquarters on the doorstep",
    universities: "30+",
    tuition: "₹12L - 26L / year",
    living: "₹8L - 13L / year",
    postStudyWork: "2 years on the Third Level Graduate Programme",
    intakes: "September, January",
    popularCourses: ["Data Analytics", "Pharmaceutical Science", "FinTech"],
  },
];

export type Step = { title: string; window: string; detail: string };

/** The application year, in the order it actually happens. */
export const applicationSteps: Step[] = [
  {
    title: "Shortlist countries and courses",
    window: "12-18 months ahead",
    detail:
      "Work backwards from the career you want and what you can fund. Country rules on post-study work matter as much as the ranking of the university.",
  },
  {
    title: "Sit the entrance and language tests",
    window: "10-12 months ahead",
    detail:
      "Most applications need one language test and, for some courses, an aptitude test. Book early: scores take two to three weeks to reach universities.",
  },
  {
    title: "Prepare the application",
    window: "8-10 months ahead",
    detail:
      "Transcripts, a statement of purpose, and two or three recommendation letters. Deadlines for the first round are usually the most generous on funding.",
  },
  {
    title: "Arrange funding",
    window: "4-6 months ahead",
    detail:
      "Scholarships, education loans and proof of funds for the visa. Sanction letters take longer than most applicants expect.",
  },
  {
    title: "Apply for the visa and fly",
    window: "2-4 months ahead",
    detail:
      "Offer letter, funds, and in most countries an interview or biometrics appointment. Accommodation is usually booked in the same window.",
  },
];

export type AdmissionTest = {
  name: string;
  purpose: string;
  validity: string;
  /** Internal exam page where one exists, otherwise null. */
  href: string | null;
};

export const admissionTests: AdmissionTest[] = [
  {
    name: "IELTS",
    purpose: "English proficiency, accepted almost everywhere",
    validity: "2 years",
    href: null,
  },
  {
    name: "TOEFL iBT",
    purpose: "English proficiency, preferred by many US universities",
    validity: "2 years",
    href: null,
  },
  {
    name: "GRE",
    purpose: "Master's admissions, chiefly in the US",
    validity: "5 years",
    href: null,
  },
  {
    name: "GMAT",
    purpose: "MBA and management master's admissions",
    validity: "5 years",
    href: null,
  },
];

export type Faq = { question: string; answer: string };

export const faqs: Faq[] = [
  {
    question: "When should I start preparing?",
    answer:
      "Between 12 and 18 months before the intake you want. Tests, transcripts and loan sanctions each take weeks, and the earliest application rounds usually carry the best scholarship odds.",
  },
  {
    question: "How much does a year abroad actually cost?",
    answer:
      "Tuition and living costs together typically run between ₹20 lakh and ₹60 lakh a year depending on the country and city. The ranges on this page are indicative — a specific university and course will give you a firm figure.",
  },
  {
    question: "Can I work while studying?",
    answer:
      "Most study destinations allow part-time work during term — commonly around 20 hours a week — and full-time during vacations. The exact limit is a condition of the visa, not the university.",
  },
  {
    question: "Do I need an agent to apply?",
    answer:
      "No. Universities accept direct applications, and counselling helps most with shortlisting, documentation and visa paperwork rather than with access.",
  },
];
