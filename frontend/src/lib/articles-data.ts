/**
 * Full article records.
 *
 * Separate from lib/mock-data on purpose. Article bodies are rich text, which
 * means importing lib/rich-text — and that pulls in the ProseMirror schema.
 * `mock-data` is imported by client components (the compare tray reads the
 * college list), so putting bodies there would ship the whole editor schema to
 * every visitor's browser. Only server components import this file, so the
 * schema stays on the server where it is already needed for rendering.
 *
 * `articles` in mock-data stays as the teaser list the homepage renders; this
 * is the same set with the body attached, keyed by the same slug.
 */

import { docFromParagraphs, type RichTextDoc } from "@/lib/rich-text";

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  readMinutes: number;
  body: RichTextDoc;
  /** Colleges the piece is about, for the "mentioned in this article" rail. */
  relatedCollegeSlugs: string[];
};

export const fullArticles: Article[] = [
  {
    slug: "mba-admission-process-2026",
    title: "MBA Admission Process 2026: Dates, Rounds & What's Changed",
    excerpt:
      "Every stage of the 2026 MBA admission cycle — entrance windows, shortlisting, interviews and the two changes worth planning around.",
    date: "9 Aug 2026",
    author: "Editorial Desk",
    category: "Admissions",
    readMinutes: 7,
    body: docFromParagraphs(
      "The 2026 MBA admission cycle runs on much the same calendar as last year, with one meaningful change: most private institutes have pulled their final shortlist dates forward by roughly two weeks, which compresses the gap between results and interviews.",
      "There are four stages to plan around. The entrance window, where you register and sit CAT, XAT, NMAT or an institute test. Shortlisting, where each college applies its own percentile cut and profile weighting. The personal interview and written ability round. And finally the offer and fee-confirmation window, which is shorter than most candidates expect.",
      "The practical consequence of the compressed calendar is that document preparation cannot wait until after results. Transcripts, work-experience letters and category certificates should be collected before the entrance window closes, because the gap that used to absorb that work has largely gone.",
      "The second change is in how work experience is weighted. Several institutes have moved from a flat band to a sliding scale, which slightly favours candidates with 24 to 48 months over both fresher and long-tenure profiles.",
    ),
    relatedCollegeSlugs: [
      "bengaluru-institute-of-management-studies",
      "eastwind-institute-of-management",
    ],
  },
  {
    slug: "top-mba-placement-report-2026",
    title: "MBA Placements 2026: Final Placement Report of Top Colleges",
    excerpt:
      "Average and median packages across ranked B-schools, and why the median is the number worth reading.",
    date: "5 Aug 2026",
    author: "Editorial Desk",
    category: "Placements",
    readMinutes: 6,
    body: docFromParagraphs(
      "Placement season closed stronger than 2025 across the ranked private institutes, with averages up between 8% and 14% depending on the cohort.",
      "The average is the number that gets published, but the median is the one that describes your likely outcome. A handful of very large international offers pulls an average upward without changing what the middle of the batch actually received — which is why a college quoting only its highest package is telling you the least useful figure it has.",
      "Analytics and consulting roles drove most of the increase. Operations and general management offers were broadly flat year on year.",
    ),
    relatedCollegeSlugs: [
      "eastwind-institute-of-management",
      "bengaluru-institute-of-management-studies",
      "horizon-school-of-business",
    ],
  },
  {
    slug: "executive-mba-eligibility-explained",
    title: "Executive MBA Eligibility: Who Can Apply and When",
    excerpt:
      "Work-experience minimums, accepted entrance tests, and how weekend and modular formats differ in practice.",
    date: "3 Aug 2026",
    author: "Editorial Desk",
    category: "Courses",
    readMinutes: 5,
    body: docFromParagraphs(
      "Executive MBA programmes accept candidates with a minimum of two years' full-time work experience, though in practice the admitted cohort usually averages closer to six.",
      "Most institutes accept CAT or GMAT, and several run their own entrance test for this cohort specifically. A smaller number waive the test entirely above a work-experience threshold, typically ten years.",
      "The format matters more than the eligibility bar. A weekend programme runs alongside full-time employment and takes 15 to 24 months; a modular programme concentrates teaching into residential blocks, which is easier to combine with travel-heavy roles but harder to combine with a fixed shift pattern.",
    ),
    relatedCollegeSlugs: ["bengaluru-institute-of-management-studies"],
  },
];

export const articleBySlug = (slug: string) =>
  fullArticles.find((article) => article.slug === slug);

/** Everything except the one being read, newest first as authored. */
export const otherArticles = (slug: string, limit = 3) =>
  fullArticles.filter((article) => article.slug !== slug).slice(0, limit);
