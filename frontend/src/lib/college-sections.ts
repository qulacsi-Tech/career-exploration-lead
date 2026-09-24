/**
 * The college page's sections — one ordered list, read by everything.
 *
 * Each section of a college record is its own URL
 * (`/college/<slug>/<section>`), so this module is what the tab rail, each
 * section page's 404 check, and `generateStaticParams` all agree on.
 *
 * ## A fixed rail
 *
 * Names and order are the Shiksha-style rail the client asked for, exactly:
 * College Info, Courses, Fees, Reviews, Admissions, Placements, Cut-Offs,
 * Rankings, Gallery, Infrastructure, Faculty, Compare, Q&A, Scholarships, News.
 *
 * Every college shows every tab, so the rail is the same shape on every college
 * page and a visitor learns it once. A section a college has no content for
 * yet renders an empty-state card on its page (see `EmptyCard`) rather than
 * the tab disappearing. URL segments predate the rename (`hostel` for
 * Infrastructure, `admission-process` for Admissions, `articles` for News) and
 * are kept so existing links still resolve.
 */

import type { College } from "@/lib/mock-data";

export type CollegeSection = {
  /** URL segment. The overview's is empty — it is the college's own page. */
  slug: string;
  label: string;
  /** Shown under the heading on the section's page. */
  blurb: (college: College) => string;
};

export const collegeSections: CollegeSection[] = [
  {
    slug: "",
    label: "College Info",
    blurb: (college) => `About ${college.name}, its campus and key facts.`,
  },
  {
    slug: "courses",
    label: "Courses",
    blurb: (college) => `Programmes offered at ${college.name}, with duration, mode and accepted entrance exams.`,
  },
  {
    slug: "fees",
    label: "Fees",
    blurb: (college) => `Total fees for every programme at ${college.name}, compared side by side.`,
  },
  {
    slug: "reviews",
    label: "Reviews",
    blurb: (college) => `Verified student reviews of ${college.name}, rated across placements, faculty, infrastructure and campus life.`,
  },
  {
    slug: "admission-process",
    label: "Admissions",
    blurb: (college) => `Step-by-step admission process, documents and key dates for ${college.name}.`,
  },
  {
    slug: "placements",
    label: "Placements",
    blurb: (college) => `Placement averages, medians, highest package and top recruiters at ${college.name}.`,
  },
  {
    slug: "cutoffs",
    label: "Cut-Offs",
    blurb: (college) => `Entrance exam cut-offs at ${college.name} by exam and category.`,
  },
  {
    slug: "rankings",
    label: "Rankings",
    blurb: (college) => `Where ${college.name} ranks, and how it compares with other ${college.stream.toLowerCase()} colleges.`,
  },
  {
    slug: "gallery",
    label: "Gallery",
    blurb: (college) => `Photos and videos of the ${college.name} campus.`,
  },
  {
    slug: "hostel",
    label: "Infrastructure",
    blurb: (college) => `Hostel, mess, sports and campus amenities at ${college.name}.`,
  },
  {
    slug: "faculty",
    label: "Faculty",
    blurb: (college) => `Faculty at ${college.name} and how students rate their teaching.`,
  },
  {
    slug: "compare",
    label: "Compare",
    blurb: (college) => `${college.name} side by side with the colleges closest to it.`,
  },
  {
    slug: "qna",
    label: "Q&A",
    blurb: (college) => `Answers to the questions students ask most about ${college.name}.`,
  },
  {
    slug: "scholarships",
    label: "Scholarships",
    blurb: (college) => `Institute and government scholarships available at ${college.name}, with eligibility and how to apply.`,
  },
  {
    slug: "articles",
    label: "News",
    blurb: (college) => `News, updates and admission articles about ${college.name}.`,
  },
];

/**
 * The tab slug a URL segment maps to the rich-text template slug.
 *
 * `hostel` in the URL, `hostel-facilities` in the content model — the URL is
 * shorter because it is read by people, and the template slug predates it.
 */
export const TAB_SLUG_FOR_SECTION: Record<string, string> = {
  scholarships: "scholarships",
  hostel: "hostel-facilities",
  "admission-process": "admission-process",
};

/** One section by URL segment, or undefined — the 404 check on each page. */
export function sectionBySlug(slug: string): CollegeSection | undefined {
  return collegeSections.find((section) => section.slug === slug);
}

/** `/college/<slug>` for the overview, `/college/<slug>/<section>` otherwise. */
export function sectionHref(collegeSlug: string, sectionSlug: string): string {
  return sectionSlug ? `/college/${collegeSlug}/${sectionSlug}` : `/college/${collegeSlug}`;
}
