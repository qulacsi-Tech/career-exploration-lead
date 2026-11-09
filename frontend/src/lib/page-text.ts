/**
 * Every heading and description on a college's pages that the admin can reword, in one list.
 *
 * The public pages read their words with `pageText(college, key)`: the text the admin wrote for that key, or else the
 * usual wording below. The admin's "Page Text" tab lists the same fields, showing the usual wording as a hint, so the
 * two can never drift apart. `{name}` (the college's name), `{short}` (its short name) and `{stream}` (its category)
 * can be used in anything the admin writes and are filled in on the page.
 */

import { collegeSections } from "@/lib/college-sections";
import type { CollegeDetail } from "@/lib/api";

/** What a default or an override can mention about the college. */
export type TextCollege = { name: string; shortName?: string; stream?: string };

export type PageTextField = {
  key: string;
  /** The tab it belongs to, as the admin groups it. */
  group: string;
  label: string;
  kind: "heading" | "description";
  /** The usual wording. */
  usual: (c: { name: string; short: string; stream: string }) => string;
};

const blurb = (slug: string) => (c: { name: string; stream: string }) => collegeSections.find((s) => s.slug === slug)?.blurb({ name: c.name, stream: c.stream } as CollegeDetail) ?? "";

/** The page heading and description of a tab, then the cards on it. */
export const PAGE_TEXT_GROUPS = [
  "College Info",
  "Courses",
  "Fees",
  "Reviews",
  "Placements",
  "Cut-Offs",
  "Gallery",
  "Faculty",
  "Compare",
  "Q&A",
  "News",
  "Admissions, Infrastructure and Scholarships",
] as const;

const page = (group: string, slug: string, tab: string): PageTextField[] => [
  { key: `${slug}.heading`, group, label: `${tab} page heading`, kind: "heading", usual: (c) => `${c.name} ${collegeSections.find((s) => s.slug === slug)?.label ?? tab}` },
  { key: `${slug}.description`, group, label: `${tab} page description`, kind: "description", usual: blurb(slug) },
];

export const PAGE_TEXT: PageTextField[] = [
  // College Info (the overview)
  { key: "overview.about", group: "College Info", label: "About card heading", kind: "heading", usual: (c) => `About ${c.short}` },
  { key: "overview.courses", group: "College Info", label: "Courses & fees card heading", kind: "heading", usual: () => "Courses & Fees" },
  { key: "overview.recruiters", group: "College Info", label: "Top recruiters heading", kind: "heading", usual: () => "Top Recruiters" },
  { key: "overview.students", group: "College Info", label: "What students say heading", kind: "heading", usual: () => "What Students Say" },
  { key: "overview.cutoffs", group: "College Info", label: "Cut-offs card heading", kind: "heading", usual: (c) => `${c.short} Cut-Offs` },
  { key: "overview.reviews", group: "College Info", label: "Reviews card heading", kind: "heading", usual: (c) => `Reviews about ${c.short}` },
  { key: "overview.similar", group: "College Info", label: "Similar colleges heading", kind: "heading", usual: (c) => `Explore Colleges Similar to ${c.short}` },

  // Courses
  ...page("Courses", "courses", "Courses"),
  { key: "courses.all", group: "Courses", label: "Courses list heading", kind: "heading", usual: () => "All Courses" },
  { key: "courses.empty.title", group: "Courses", label: "No courses: heading", kind: "heading", usual: () => "No programmes listed yet" },
  { key: "courses.empty.body", group: "Courses", label: "No courses: description", kind: "description", usual: (c) => `${c.name} has not published its programme list here yet.` },

  // Fees
  ...page("Fees", "fees", "Fees"),
  { key: "fees.total", group: "Fees", label: "Total fees card heading", kind: "heading", usual: () => "Total Fees by Programme" },
  { key: "fees.structure", group: "Fees", label: "Fee structure card heading", kind: "heading", usual: () => "Fee Structure" },
  { key: "fees.empty.title", group: "Fees", label: "No fees: heading", kind: "heading", usual: () => "No fee details yet" },
  { key: "fees.empty.body", group: "Fees", label: "No fees: description", kind: "description", usual: (c) => `${c.name} has not published its fee structure here yet.` },

  // Reviews
  ...page("Reviews", "reviews", "Reviews"),
  { key: "reviews.category", group: "Reviews", label: "Rating by category heading", kind: "heading", usual: () => "Rating by category" },
  { key: "reviews.list", group: "Reviews", label: "Reviews list heading", kind: "heading", usual: (c) => `Reviews from ${c.name} Students` },
  { key: "reviews.empty.title", group: "Reviews", label: "No reviews: heading", kind: "heading", usual: () => "No reviews yet" },
  { key: "reviews.empty.body", group: "Reviews", label: "No reviews: description", kind: "description", usual: (c) => `Be the first to review ${c.name} — or ask a counsellor what current students say.` },

  // Placements
  ...page("Placements", "placements", "Placements"),
  { key: "placements.stats", group: "Placements", label: "Statistics card heading", kind: "heading", usual: () => "Placement Statistics" },
  { key: "placements.spread", group: "Placements", label: "Package spread heading", kind: "heading", usual: () => "Package spread" },
  { key: "placements.recruiters", group: "Placements", label: "Top recruiters heading", kind: "heading", usual: () => "Top Recruiters" },
  { key: "placements.byCourse", group: "Placements", label: "By course card heading", kind: "heading", usual: () => "By Course and Specialisation" },
  { key: "placements.earlier", group: "Placements", label: "Earlier years heading", kind: "heading", usual: () => "Earlier Years" },
  { key: "placements.say", group: "Placements", label: "What students say heading", kind: "heading", usual: () => "What Students Say About Placements" },
  { key: "placements.empty.title", group: "Placements", label: "No placements: heading", kind: "heading", usual: () => "No placement data" },
  { key: "placements.empty.body", group: "Placements", label: "No placements: description", kind: "description", usual: (c) => `${c.name} has not published placement figures.` },

  // Cut-Offs
  ...page("Cut-Offs", "cutoffs", "Cut-Offs"),
  { key: "cutoffs.summary", group: "Cut-Offs", label: "Summary card heading", kind: "heading", usual: () => "Cut-Off Summary" },
  { key: "cutoffs.byExam", group: "Cut-Offs", label: "By exam and category heading", kind: "heading", usual: () => "By Exam and Caste" },
  { key: "cutoffs.empty.title", group: "Cut-Offs", label: "No cut-offs: heading", kind: "heading", usual: () => "No cut-offs published yet" },
  { key: "cutoffs.empty.body", group: "Cut-Offs", label: "No cut-offs: description", kind: "description", usual: (c) => `${c.name} has not published entrance cut-offs here yet.` },

  // Gallery
  ...page("Gallery", "gallery", "Gallery"),
  { key: "gallery.empty.title", group: "Gallery", label: "No photos: heading", kind: "heading", usual: () => "No photos or videos yet" },
  { key: "gallery.empty.body", group: "Gallery", label: "No photos: description", kind: "description", usual: (c) => `${c.name} has not published campus photos or videos here yet.` },

  // Faculty
  ...page("Faculty", "faculty", "Faculty"),
  { key: "faculty.glance", group: "Faculty", label: "At a glance heading", kind: "heading", usual: () => "Faculty at a Glance" },
  { key: "faculty.say", group: "Faculty", label: "What students say heading", kind: "heading", usual: () => "What Students Say About Faculty" },
  { key: "faculty.empty.title", group: "Faculty", label: "No faculty: heading", kind: "heading", usual: () => "Faculty profiles coming soon" },
  { key: "faculty.empty.body", group: "Faculty", label: "No faculty: description", kind: "description", usual: (c) => `${c.name} has not published its faculty list here yet. A counsellor can share department and teaching staff details.` },

  // Compare
  ...page("Compare", "compare", "Compare"),
  { key: "compare.vs", group: "Compare", label: "Side by side heading", kind: "heading", usual: (c) => `${c.name} vs Similar Colleges` },
  { key: "compare.choose", group: "Compare", label: "Which should you choose heading", kind: "heading", usual: () => "Which Should You Choose?" },
  { key: "compare.empty.title", group: "Compare", label: "No comparisons: heading", kind: "heading", usual: () => "No comparisons yet" },
  { key: "compare.empty.body", group: "Compare", label: "No comparisons: description", kind: "description", usual: (c) => `There are no similar colleges to compare ${c.name} with yet.` },

  // Q&A
  ...page("Q&A", "qna", "Q&A"),

  // News
  ...page("News", "articles", "News"),
  { key: "news.alerts", group: "News", label: "Alerts heading", kind: "heading", usual: () => "Alerts" },
  { key: "news.latest", group: "News", label: "Latest news heading", kind: "heading", usual: () => "Latest News" },
  { key: "news.more", group: "News", label: "More updates heading", kind: "heading", usual: () => "More Updates" },
  { key: "news.press", group: "News", label: "In the press heading", kind: "heading", usual: () => "In the Press" },
  { key: "news.empty.title", group: "News", label: "No news: heading", kind: "heading", usual: () => "No news yet" },
  { key: "news.empty.body", group: "News", label: "No news: description", kind: "description", usual: (c) => `There are no news or updates about ${c.name} yet.` },

  // The written tabs share a card
  { key: "written.full", group: "Admissions, Infrastructure and Scholarships", label: "Full details card heading", kind: "heading", usual: () => "Full Details" },
  { key: "written.media", group: "Admissions, Infrastructure and Scholarships", label: "Pictures and videos heading", kind: "heading", usual: () => "Photos & Videos" },
];

const BY_KEY = new Map(PAGE_TEXT.map((f) => [f.key, f]));

const fill = (text: string, c: { name: string; short: string; stream: string }) => text.replaceAll("{name}", c.name).replaceAll("{short}", c.short).replaceAll("{stream}", c.stream);

function context(college: TextCollege) {
  return { name: college.name, short: college.shortName?.trim() || college.name, stream: college.stream ?? "" };
}

/** The usual wording of a field for this college, as the admin sees it before writing anything. */
export function usualText(key: string, college: TextCollege): string {
  return BY_KEY.get(key)?.usual(context(college)) ?? "";
}

/** What the page says for this key: the admin's wording, else the usual one. */
export function pageText(college: TextCollege & { pageText?: Record<string, string> }, key: string): string {
  const c = context(college);
  const written = college.pageText?.[key]?.trim();
  return written ? fill(written, c) : (BY_KEY.get(key)?.usual(c) ?? "");
}
