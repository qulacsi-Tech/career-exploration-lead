/**
 * Consistency checks on one college record — what the admin editor flags.
 *
 * The detail page draws several figures twice, once from a summary field and
 * once from the rows behind it: the fee range beside each programme's fee, the
 * programme count beside the programme list, the overall rating beside the
 * category scores. When an editor updates one and not the other, the page
 * contradicts itself on screen. These checks catch exactly those pairs, plus
 * the detail-page fields that are still empty, so an editor sees what the page
 * will fall back on before a visitor does.
 *
 * Pure and synchronous: it runs on the record in the editor, and will run the
 * same way on the API's response once there is one.
 */

import type { College } from "@/lib/mock-data";
import { galleryFor, tabBody } from "@/lib/college-content";
import { lakhValue } from "@/lib/college-insights";
import { rankingsForCollege } from "@/lib/rankings-data";
import { isRichTextEmpty } from "@/lib/rich-text";

export type AuditIssue = {
  /** mismatch: two fields disagree on the page. gap: a field the page falls back on. */
  kind: "mismatch" | "gap";
  /** The admin editor tab that fixes it — matches the tab ids there. */
  tab: string;
  message: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function auditCollege(college: College): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const mismatch = (tab: string, message: string) => issues.push({ kind: "mismatch", tab, message });
  const gap = (tab: string, message: string) => issues.push({ kind: "gap", tab, message });

  /* ---- Programmes ---- */
  if (college.coursesOffered < college.courses.length) {
    mismatch(
      "courses",
      `"Courses offered" is ${college.coursesOffered} but ${college.courses.length} programmes are listed.`,
    );
  } else if (college.coursesOffered > college.courses.length) {
    gap(
      "courses",
      `"Courses offered" is ${college.coursesOffered} but only ${college.courses.length} programmes are listed with fees.`,
    );
  }

  /* ---- Fee range against the programme fees ---- */
  const fees = college.courses
    .map((course) => lakhValue(course.fees))
    .filter((value): value is number => value !== null);
  const range = (college.feesRange.match(/[\d.]+/g) ?? []).map(Number);
  if (fees.length > 0 && range.length === 2) {
    const [low, high] = [Math.min(...fees), Math.max(...fees)];
    /* A listed fee outside the range contradicts it on screen. A range wider
       than the listed fees may just cover programmes not listed — a gap. */
    if (round1(low) < round1(range[0]) || round1(high) > round1(range[1])) {
      mismatch(
        "fees",
        `Fee range "${college.feesRange}" excludes listed programme fees (₹${low}L – ₹${high}L).`,
      );
    } else if (round1(low) !== round1(range[0]) || round1(high) !== round1(range[1])) {
      gap(
        "fees",
        `Fee range "${college.feesRange}" is wider than the listed programmes (₹${low}L – ₹${high}L) — list the rest or narrow it.`,
      );
    }
  }

  /* ---- Exams ---- */
  const courseExams = new Set(college.courses.flatMap((course) => course.exams));
  const unlisted = [...courseExams].filter(
    (exam) => !college.examsAccepted.includes(exam) && !/institute/i.test(exam),
  );
  if (unlisted.length > 0) {
    mismatch("courses", `Programmes accept ${unlisted.join(", ")}, missing from "Exams accepted".`);
  }
  const cutoffExams = [...new Set(college.cutoffs.map((cutoff) => cutoff.exam))].filter(
    (exam) => !college.examsAccepted.includes(exam),
  );
  if (cutoffExams.length > 0) {
    mismatch("cutoffs", `Cut-offs are listed for ${cutoffExams.join(", ")}, which is not in "Exams accepted".`);
  }

  /* ---- Ratings ---- */
  if (college.ratingBreakdown.length > 0) {
    const mean =
      college.ratingBreakdown.reduce((total, row) => total + row.score, 0) /
      college.ratingBreakdown.length;
    if (Math.abs(mean - college.rating) > 0.2) {
      mismatch(
        "reviews",
        `Overall rating ${college.rating} is far from the category average ${mean.toFixed(1)}.`,
      );
    }
  }
  if (college.reviewCount < college.reviews.length) {
    mismatch(
      "reviews",
      `Review count ${college.reviewCount} is lower than the ${college.reviews.length} reviews on the record.`,
    );
  }

  /* ---- Placements ---- */
  const average = lakhValue(college.placement.average);
  const highest = lakhValue(college.placement.highest);
  if (average !== null && highest !== null && highest < average) {
    mismatch("placements", `Highest package ${college.placement.highest} is below the average.`);
  }

  /* ---- Ranking against the Rankings module ---- */
  const listed = rankingsForCollege(college.slug).find(
    (row) => row.list.scopeValue === college.ranking.authority,
  );
  if (listed && listed.entry.rank !== college.ranking.rank) {
    mismatch(
      "rankings",
      `Record says ${college.ranking.authority} #${college.ranking.rank}; the "${listed.list.name}" list says #${listed.entry.rank}.`,
    );
  }

  /* ---- Detail-page fields still empty ---- */
  if (!college.shortName) gap("basic", "No short name — the title uses the college's initials and city.");
  if (!college.coverImage) gap("basic", "No cover photo — the banner uses a stock campus photo.");
  if (!college.logo) gap("basic", "No logo — the page shows the college's initials.");
  if (!college.brochureUrl) gap("basic", "No brochure — the Brochure button opens the enquiry form.");
  if (!college.faculty) gap("faculty", "No faculty details — the Faculty tab shows only the student rating.");
  if (!college.faqs?.length) gap("qna", "No written Q&A — the page shows only generated answers.");
  if (!college.seo?.metaTitle) gap("seo", "No meta title — search results use a generated one.");
  const gallery = galleryFor(college.slug);
  if (gallery.some((image) => !image.src)) {
    gap("gallery", "Some gallery photos have no uploaded file — the page shows stock photos for them.");
  }
  for (const [tab, template, label] of [
    ["admissions", "admission-process", "Admissions"],
    ["infrastructure", "hostel-facilities", "Infrastructure"],
    ["scholarships", "scholarships", "Scholarships"],
  ] as const) {
    if (isRichTextEmpty(tabBody(college.slug, template))) gap(tab, `${label} has no content — the tab shows an empty state.`);
  }

  return issues;
}
