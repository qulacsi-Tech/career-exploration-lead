/**
 * College comparison (MOM §1.6).
 *
 * ## Why these are pages, not a modal
 *
 * A comparison rendered into a modal or held in client state captures none of
 * the traffic it deserves. "IIM Bangalore vs XLRI" is about as high-intent as a
 * search gets — someone typing it has shortlisted and is choosing — and this
 * project's whole premise is organic search. So a comparison is a URL:
 * `/compare/bims-vs-eastwind`, server-rendered, with its own metadata.
 *
 * The compare tray is still client state, because a selection in progress is
 * not a page. It resolves to one of these URLs when the visitor commits.
 *
 * ## Attribute set
 *
 * Fees, placements, ranking, cutoffs, approvals, courses and rating — the 5 Sep
 * decision on §11 Q4. Curated pairs are hand-authored rather than generated
 * from adjacent ranking entries: auto-generated comparison pages are thin by
 * construction, and a few hundred of them is the kind of thing that draws a
 * manual action rather than traffic.
 */

import { colleges, type College } from "@/lib/mock-data";

/** The maximum a comparison table stays readable at. */
export const MAX_COMPARE = 3;

/**
 * One row of the comparison table.
 *
 * `value` returns a string rather than the raw field so formatting lives beside
 * the label instead of in the template, and `better` marks the column that wins
 * a row where "winning" is meaningful — rank and rating — and returns null
 * where it is not. Fees are deliberately not scored: cheaper is not better
 * without knowing what the person can pay.
 */
export type CompareRow = {
  key: string;
  label: string;
  value: (college: College) => string;
  /** Index of the winning college, or null when the row has no winner. */
  better?: (list: College[]) => number | null;
};

const lowestWins = (score: (c: College) => number) => (list: College[]) => {
  const scores = list.map(score);
  const best = Math.min(...scores);
  // A tie has no winner: highlighting the first of two equal values invents a
  // difference that is not there.
  return scores.filter((s) => s === best).length === 1 ? scores.indexOf(best) : null;
};

const highestWins = (score: (c: College) => number) => (list: College[]) => {
  const scores = list.map(score);
  const best = Math.max(...scores);
  return scores.filter((s) => s === best).length === 1 ? scores.indexOf(best) : null;
};

/** Parses "₹14.2 LPA" to 14.2 so packages can be compared numerically. */
const lpa = (value: string) => Number.parseFloat(value.replace(/[^\d.]/g, "")) || 0;

export const compareRows: CompareRow[] = [
  {
    key: "location",
    label: "Location",
    value: (c) => `${c.city}, ${c.state}`,
  },
  {
    key: "ownership",
    label: "Ownership",
    value: (c) => c.ownership,
  },
  {
    key: "established",
    label: "Established",
    value: (c) => String(c.established),
  },
  {
    key: "ranking",
    label: "Ranking",
    value: (c) => `#${c.ranking.rank} ${c.ranking.authority}`,
    better: lowestWins((c) => c.ranking.rank),
  },
  {
    key: "rating",
    label: "Student rating",
    value: (c) => `${c.rating} / 5 (${c.reviewCount} reviews)`,
    better: highestWins((c) => c.rating),
  },
  {
    key: "fees",
    label: "Fees range",
    value: (c) => c.feesRange,
  },
  {
    key: "placement-average",
    label: "Average package",
    value: (c) => c.placement.average,
    better: highestWins((c) => lpa(c.placement.average)),
  },
  {
    key: "placement-highest",
    label: "Highest package",
    value: (c) => c.placement.highest,
    better: highestWins((c) => lpa(c.placement.highest)),
  },
  {
    key: "recruiters",
    label: "Top recruiters",
    value: (c) => c.placement.topRecruiters.slice(0, 4).join(", "),
  },
  {
    key: "courses",
    label: "Courses offered",
    value: (c) => `${c.coursesOffered} · ${c.courses.map((course) => course.name).join(", ")}`,
  },
  {
    key: "exams",
    label: "Exams accepted",
    value: (c) => c.examsAccepted.join(", "),
  },
  {
    key: "cutoffs",
    label: "Cutoffs",
    value: (c) =>
      c.cutoffs.length
        ? c.cutoffs.map((cut) => `${cut.exam} ${cut.category}: ${cut.score}`).join(" · ")
        : "—",
  },
  {
    key: "approvals",
    label: "Approvals",
    value: (c) => c.approvals.join(", "),
  },
];

/**
 * A hand-authored comparison page.
 *
 * `intro` and `verdict` are editorial: the reason someone lands here is that
 * they want a view, not two columns of numbers they could have read on the two
 * college pages. That copy is also what stops the page being thin.
 */
export type CuratedComparison = {
  slug: string;
  title: string;
  metaDescription: string;
  collegeSlugs: string[];
  intro: string;
  verdict: string;
};

export const curatedComparisons: CuratedComparison[] = [
  {
    slug: "bims-vs-eastwind",
    title: "BIMS vs Eastwind: Which MBA College Should You Choose?",
    metaDescription:
      "Compare Bengaluru Institute of Management Studies and Eastwind Institute of Management on fees, placements, NIRF ranking and CAT cutoffs.",
    collegeSlugs: [
      "bengaluru-institute-of-management-studies",
      "eastwind-institute-of-management",
    ],
    intro:
      "Both are top-25 private management institutes with strong consulting placement records, and candidates with a 90+ CAT percentile frequently hold offers from each. The choice usually comes down to cost against placement ceiling.",
    verdict:
      "Eastwind places higher and pays more, but costs roughly ₹3.4L more in total fees. If you are financing through a loan, BIMS reaches a similar median at a materially lower principal. If you are targeting consulting specifically, Eastwind's on-campus recruiter list is the stronger one.",
  },
  {
    slug: "kaveri-vs-northgate",
    title: "Kaveri vs Northgate: Which Engineering College Is Better?",
    metaDescription:
      "Compare Kaveri Institute of Technology and Northgate College of Engineering on fees, placements, JEE and state cutoffs.",
    collegeSlugs: ["kaveri-institute-of-technology", "northgate-college-of-engineering"],
    intro:
      "Kaveri and Northgate serve different regional intakes — KCET and COMEDK for one, MHT CET for the other — so most candidates are choosing between them on branch and placement rather than on entrance exam.",
    verdict:
      "Kaveri is ahead on computer science placements and takes a wider exam pool. Northgate's mechanical track and its Pune automotive tie-ups are the stronger option if that is the branch you want.",
  },
  {
    slug: "top-management-colleges-compared",
    title: "Which Management College Should I Choose?",
    metaDescription:
      "Compare the top private management colleges on fees, placements, rankings and CAT cutoffs, side by side.",
    collegeSlugs: [
      "bengaluru-institute-of-management-studies",
      "eastwind-institute-of-management",
      "horizon-school-of-business",
    ],
    intro:
      "The three private management institutes most often shortlisted together, compared on the attributes that actually separate them.",
    verdict:
      "Eastwind leads on placements and ranking, BIMS offers the best value at its fee level, and Horizon is the most accessible on cutoffs — worth a place on a shortlist as the safe option rather than the target.",
  },
];

export const collegesBySlugs = (slugs: string[]) =>
  slugs
    .map((slug) => colleges.find((college) => college.slug === slug))
    .filter((college): college is College => college !== undefined);

export const curatedBySlug = (slug: string) =>
  curatedComparisons.find((comparison) => comparison.slug === slug);

/**
 * Comparisons that feature a given college — what the "compare with similar
 * colleges" block at the bottom of a college page offers.
 */
export const comparisonsFeaturing = (collegeSlug: string) =>
  curatedComparisons.filter((c) => c.collegeSlugs.includes(collegeSlug));

/**
 * Suggested opponents for a college with no curated pair: same program, nearest
 * by rank. Someone comparing is choosing between peers, and a college fifty
 * places away is not a peer.
 */
export const similarColleges = (college: College, limit = 3) =>
  colleges
    .filter((c) => c.slug !== college.slug && c.stream === college.stream)
    .sort(
      (a, b) =>
        Math.abs(a.ranking.rank - college.ranking.rank) -
        Math.abs(b.ranking.rank - college.ranking.rank),
    )
    .slice(0, limit);

/**
 * Builds the canonical URL for an ad-hoc comparison.
 *
 * Slugs are sorted so that picking A then B and picking B then A produce the
 * same URL. Two URLs for one comparison is a duplicate-content problem, and on
 * a site built for search that is the kind of thing that quietly halves the
 * value of the whole feature.
 */
export const compareUrl = (slugs: string[]) =>
  `/compare/${[...slugs].sort().join("-vs-")}`;

/**
 * Resolves a `/compare/[slug]` path back to colleges.
 *
 * Curated pages win over the generated form, so an editor can take over a URL
 * that was previously auto-resolving without breaking the link.
 *
 * The generated form splits on "-vs-", which is unambiguous only because no
 * college slug contains it — worth knowing if slugs ever become free text.
 */
export const resolveComparison = (slug: string) => {
  const curated = curatedBySlug(slug);
  if (curated) {
    return { curated, colleges: collegesBySlugs(curated.collegeSlugs) };
  }

  const parts = slug.split("-vs-");
  if (parts.length < 2 || parts.length > MAX_COMPARE) return null;

  const found = collegesBySlugs(parts);
  // Every part must resolve: a URL naming a college that does not exist is a
  // 404, not a comparison with a gap in it.
  if (found.length !== parts.length) return null;

  return { curated: null, colleges: found };
};
