/**
 * The college page's sections — one ordered list, read by everything.
 *
 * Each section of a college record is its own URL
 * (`/college/<slug>/<section>`), so this module is what the tab rail, each
 * section page's existence check, and `generateStaticParams` all agree on.
 * Holding it in one place is the point: a college with no videos must get no
 * Videos tab **and** a 404 at `/college/<slug>/videos`, and those two facts
 * drifting apart is how a nav link starts pointing at a dead page.
 *
 * ## Order
 *
 * The order below is the delivered answer to the 15 Sep feedback: Scholarships
 * and Hostel & Facilities sit **before** Videos. They used to fall after it
 * because the old in-page rail appended every custom tab to the end of the
 * array, after the fixed entries. Here they hold declared positions instead of
 * being appended, so adding a future template cannot quietly push them back
 * behind Videos again.
 *
 * ## Why a `has` predicate rather than a flag on the college
 *
 * A section exists for a college when it has content for it, which is a
 * question only the content modules can answer — and they answer it
 * differently per section (an array length for videos, a non-empty rich-text
 * document for scholarships). Keeping the predicate beside the label means the
 * rail and the route agree by construction rather than by two people
 * remembering the same rule.
 */

import type { College } from "@/lib/mock-data";
import {
  articlesFor,
  highlightsFor,
  tabBody,
  videosFor,
} from "@/lib/college-content";
import { isRichTextEmpty } from "@/lib/rich-text";

export type CollegeSection = {
  /** URL segment. The overview's is empty — it is the college's own page. */
  slug: string;
  label: string;
  /** Shown under the heading on the section's page. */
  blurb: (college: College) => string;
  /**
   * Whether this college has anything to show here. Sections that are always
   * present — the ones backed by fields on the record itself — return true.
   */
  has: (college: College) => boolean;
};

/**
 * A rich-text tab counts as present only when its body has substance.
 *
 * `isRichTextEmpty` rather than a length check: opening the editor and closing
 * it leaves one empty paragraph, which is structurally non-empty and would
 * render as a heading over nothing. `horizon-school-of-business` carries
 * exactly such a document for `hostel-facilities` and is the case to test.
 */
const hasTabContent = (tabSlug: string) => (college: College) =>
  !isRichTextEmpty(tabBody(college.slug, tabSlug));

export const collegeSections: CollegeSection[] = [
  {
    slug: "",
    label: "Overview",
    blurb: (college) => `About ${college.name}, its campus and key facts.`,
    has: () => true,
  },
  {
    slug: "courses",
    label: "Courses & Fees",
    blurb: (college) =>
      `Programmes offered at ${college.name}, with duration, mode, fees and accepted entrance exams.`,
    has: (college) => college.courses.length > 0,
  },
  {
    slug: "cutoffs",
    label: "Cutoffs",
    blurb: (college) =>
      `Entrance exam cutoffs at ${college.name} by exam and category.`,
    has: (college) => college.cutoffs.length > 0,
  },
  {
    slug: "placements",
    label: "Placements",
    blurb: (college) =>
      `Placement averages, medians, highest package and top recruiters at ${college.name}.`,
    has: () => true,
  },
  /* Scholarships and Hostel & Facilities, ahead of Videos — 15 Sep feedback. */
  {
    slug: "scholarships",
    label: "Scholarships",
    blurb: (college) =>
      `Institute and government scholarships available at ${college.name}, with eligibility and how to apply.`,
    has: hasTabContent("scholarships"),
  },
  {
    slug: "hostel",
    label: "Hostel & Facilities",
    blurb: (college) =>
      `Accommodation, mess, sports and campus amenities at ${college.name}.`,
    has: hasTabContent("hostel-facilities"),
  },
  {
    slug: "admission-process",
    label: "Admission Process",
    blurb: (college) =>
      `Step-by-step admission process, documents and key dates for ${college.name}.`,
    has: hasTabContent("admission-process"),
  },
  {
    slug: "gallery",
    label: "Campus",
    blurb: (college) => `Photographs of the ${college.name} campus.`,
    has: (college) => highlightsFor(college.slug).length > 0,
  },
  {
    slug: "videos",
    label: "Videos",
    blurb: (college) => `Campus tours and student videos from ${college.name}.`,
    has: (college) => videosFor(college.slug).length > 0,
  },
  {
    slug: "reviews",
    label: "Reviews",
    blurb: (college) =>
      `Verified student reviews of ${college.name}, rated across placements, faculty, infrastructure and campus life.`,
    has: (college) => college.reviews.length > 0,
  },
  {
    slug: "articles",
    label: "Articles",
    blurb: (college) => `News, updates and admission articles about ${college.name}.`,
    has: (college) => articlesFor(college.slug).length > 0,
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

/** Sections this college actually has, in order, including the overview. */
export function sectionsFor(college: College): CollegeSection[] {
  return collegeSections.filter((section) => section.has(college));
}

/** One section by URL segment, or undefined — the 404 check on each page. */
export function sectionBySlug(slug: string): CollegeSection | undefined {
  return collegeSections.find((section) => section.slug === slug);
}

/** `/college/<slug>` for the overview, `/college/<slug>/<section>` otherwise. */
export function sectionHref(collegeSlug: string, sectionSlug: string): string {
  return sectionSlug ? `/college/${collegeSlug}/${sectionSlug}` : `/college/${collegeSlug}`;
}
