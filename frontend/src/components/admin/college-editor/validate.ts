import type { CollegeRecord } from "@/lib/api";
import { withoutBrokenImages } from "@/lib/rich-text";
import {
  NEWS_YEAR_MIN,
  REVIEW_MIN_CHARS,
  TAG_MAX_CHARS,
  amountProblem,
  batchProblem,
  dateProblem,
  durationProblem,
  feeRangeProblem,
  nameProblem,
  packageProblem,
  ratioProblem,
  scoreProblem,
  yearProblem,
} from "@/lib/college-rules";

/*
  The checks the college editor runs as you type, one list per tab. They mirror the server's
  (routers/admin_college_record.py, schemas/college_detail.py and core/college_rules.py, with
  lib/college-rules.ts as the shared half), which has the last word: this is only so a mistake is
  shown on the tab it is on before Save, not after.

  A value is never quietly corrected. If it is wrong it is reported here and Save waits.
*/

export type TabId =
  | "info"
  | "courses"
  | "reviews"
  | "admissions"
  | "placements"
  | "cutoffs"
  | "rankings"
  | "gallery"
  | "infrastructure"
  | "faculty"
  | "compare"
  | "qna"
  | "scholarships"
  | "news"
  | "seo"
  | "administrative";

const SITE_OR_HTTPS = /^(\/[^\s]*|https:\/\/[^\s]+)?$/;
const HTTPS = /^(https:\/\/[^\s]+)?$/;

const empty = (...texts: (string | null | undefined)[]) => texts.every((t) => !t || !t.trim());

/**
 * The record as it is saved: a row that was added and never typed in is dropped (so adding one does not
 * start a list of "required" errors, and saving does not trip over it), and a picture in a written
 * section that cannot load is removed.
 */
export function cleanRecord(r: CollegeRecord): CollegeRecord {
  const d = r.detail;
  return {
    ...r,
    courses: r.courses.filter((c) => !(empty(c.name, c.duration, c.fees, c.eligibility) && c.exams.length === 0 && c.seats === null)),
    reviews: r.reviews.filter((v) => v.id || !empty(v.author, v.batch, v.body)),
    cutoffs: r.cutoffs.filter((c) => !empty(c.exam, c.score)),
    detail: {
      ...d,
      faculty: { ...d.faculty, members: d.faculty.members.filter((m) => !empty(m.name, m.designation, m.department, m.qualification)) },
      faqs: d.faqs.filter((f) => !empty(f.question, f.answer)),
      alerts: d.alerts.filter((a) => !empty(a.title, a.link)),
      articles: d.articles.filter((a) => !empty(a.title, a.summary, a.body)),
      media: d.media.filter((m) => !empty(m.title, m.publication, m.link)),
      videos: d.videos.filter((v) => !(empty(v.title) && !v.videoId)),
      tabs: Object.fromEntries(Object.entries(d.tabs).map(([slug, doc]) => [slug, withoutBrokenImages(doc)])),
    },
  };
}

export function problemsByTab(record: CollegeRecord): Record<TabId, string[]> {
  const r = cleanRecord(record);
  const out: Record<TabId, string[]> = {
    info: [], courses: [], reviews: [], admissions: [], placements: [], cutoffs: [], rankings: [],
    gallery: [], infrastructure: [], faculty: [], compare: [], qna: [], scholarships: [], news: [], seo: [], administrative: [],
  };
  const d = r.detail;
  const add = (tab: TabId, message: string | null) => {
    if (message) out[tab].push(message);
  };

  // College Info
  add("info", nameProblem(r.name, "The college name"));
  if (!r.state.trim()) out.info.push("Choose a state.");
  add("info", r.city.trim() ? nameProblem(r.city, "The city") : "The city is required.");
  if (!r.stream.trim()) out.info.push("Choose a category.");
  add("info", yearProblem(r.established));
  add("info", feeRangeProblem(r.feesRange, "The total fee range"));
  if (!SITE_OR_HTTPS.test(d.brochureUrl)) out.info.push("The brochure link must start with https:// or /.");
  [...r.tags, ...r.approvals].forEach((t) => {
    if (t.length > TAG_MAX_CHARS) out.info.push(`"${t.slice(0, 20)}…" is over ${TAG_MAX_CHARS} characters.`);
  });

  // Courses
  const names = new Set<string>();
  r.courses.forEach((c, i) => {
    const label = c.name.trim() || `Programme ${i + 1}`;
    if (c.name.trim().length < 2) out.courses.push(`${label}: the programme name is required.`);
    if (!c.duration.trim()) out.courses.push(`${label}: the duration is required.`);
    else add("courses", durationProblem(c.duration) && `${label}: ${durationProblem(c.duration)}`);
    if (!c.fees.trim()) out.courses.push(`${label}: the fees are required.`);
    else add("courses", amountProblem(c.fees, "Fees") && `${label}: Fees must be 0 or more.`);
    if (c.seats !== null && c.seats < 1) out.courses.push(`${label}: seats must be at least 1.`);
    const key = c.name.trim().toLowerCase();
    if (key && names.has(key)) out.courses.push(`${label} is listed more than once.`);
    names.add(key);
  });

  // Reviews
  r.reviews.forEach((v, i) => {
    const label = v.author.trim() || `Review ${i + 1}`;
    if (v.author.trim().length < 2) out.reviews.push(`${label}: the reviewer's name is required.`);
    if (!v.course.trim()) out.reviews.push(`${label}: choose the programme.`);
    if (!v.batch.trim()) out.reviews.push(`${label}: the batch is required.`);
    else add("reviews", batchProblem(v.batch) && `${label}: ${batchProblem(v.batch)}`);
    if (!v.date) out.reviews.push(`${label}: choose a date.`);
    else add("reviews", dateProblem(v.date, "The review date") && `${label}: ${dateProblem(v.date, "The review date")}`);
    const ratings: [string, number | null][] = [["Overall", v.rating], ["Placements", v.ratingPlacements], ["Faculty", v.ratingFaculty], ["Infrastructure", v.ratingInfrastructure], ["Campus life", v.ratingCampusLife]];
    ratings.forEach(([name, value]) => {
      if (value !== null && (value < 1 || value > 5)) out.reviews.push(`${label}: the ${name.toLowerCase()} rating must be between 1 and 5.`);
    });
    // A review already on the site keeps its text; a new one has to say something.
    const least = v.id ? 3 : REVIEW_MIN_CHARS;
    if (v.body.trim().length < least) out.reviews.push(`${label}: the review must be at least ${least} characters.`);
  });

  // Placements
  const years = new Set<number>();
  r.placements.forEach((p) => {
    const label = `Batch ${p.year}`;
    if (p.year < 1990 || p.year > new Date().getFullYear() + 1) out.placements.push(`${p.year}: the batch year must be between 1990 and ${new Date().getFullYear() + 1}.`);
    if (years.has(p.year)) out.placements.push(`${p.year} is listed more than once.`);
    years.add(p.year);
    (["average", "median", "highest"] as const).forEach((key) => add("placements", amountProblem(p[key], `The ${key} package`) && `${label}: The ${key} package must be 0 or more.`));
    add("placements", packageProblem(p.average, p.median, p.highest) && `${label}: ${packageProblem(p.average, p.median, p.highest)}`);
    if (p.placedPercent !== null && (p.placedPercent < 0 || p.placedPercent > 100)) out.placements.push(`${label}: batch placed must be between 0 and 100.`);
  });

  // Cut-offs
  const cuts = new Set<string>();
  r.cutoffs.forEach((c, i) => {
    const label = `${c.exam.trim() || "Exam"} / ${c.category.trim() || "category"}`;
    if (!c.exam.trim()) out.cutoffs.push(`Cut-off ${i + 1}: choose the exam.`);
    if (!c.score.trim()) out.cutoffs.push(`${label}: the score is required.`);
    else add("cutoffs", scoreProblem(c.score) && `${label}: ${scoreProblem(c.score)}`);
    const key = `${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`;
    if (c.exam.trim() && cuts.has(key)) out.cutoffs.push(`${label} is listed more than once.`);
    cuts.add(key);
  });

  // Gallery
  d.gallery.forEach((g, i) => {
    if (g.alt.trim().length < 3) out.gallery.push(`Photo ${i + 1}: describe what it shows.`);
  });
  d.videos.forEach((v, i) => {
    if (v.title.trim().length < 2) out.gallery.push(`Video ${i + 1}: the title is required.`);
    if (!v.videoId) out.gallery.push(`Video ${i + 1}: paste a YouTube or Vimeo link.`);
  });

  // Faculty
  add("faculty", ratioProblem(d.faculty.studentRatio));
  if (d.faculty.count !== null && (!Number.isInteger(d.faculty.count) || d.faculty.count < 0)) out.faculty.push("The faculty count must be a whole number, 0 or more.");
  if (d.faculty.phdPercent !== null && (!Number.isInteger(d.faculty.phdPercent) || d.faculty.phdPercent < 0 || d.faculty.phdPercent > 100)) out.faculty.push("The PhD share must be a whole number between 0 and 100.");
  d.faculty.members.forEach((m, i) => {
    if (m.name.trim().length < 2) out.faculty.push(`Member ${i + 1}: the name is required.`);
  });

  // Compare
  if (d.similarSlugs.length > 8) out.compare.push("At most 8 colleges can be pinned.");

  // Q&A
  const asked = new Set<string>();
  d.faqs.forEach((f, i) => {
    if (f.question.trim().length < 3) out.qna.push(`Question ${i + 1}: write the question.`);
    if (!f.answer.trim()) out.qna.push(`Question ${i + 1}: write the answer.`);
    const key = f.question.trim().toLowerCase().replace(/\s+/g, " ");
    if (key && asked.has(key)) out.qna.push(`Question ${i + 1}: this question is listed more than once.`);
    asked.add(key);
  });

  // News
  d.alerts.forEach((a, i) => {
    if (a.title.trim().length < 3) out.news.push(`Alert ${i + 1}: the notice is required.`);
    if (!a.date) out.news.push(`Alert ${i + 1}: choose a date.`);
    else add("news", dateProblem(a.date, "The date", NEWS_YEAR_MIN) && `Alert ${i + 1}: ${dateProblem(a.date, "The date", NEWS_YEAR_MIN)}`);
    if (!SITE_OR_HTTPS.test(a.link)) out.news.push(`Alert ${i + 1}: the link must start with / or https://.`);
  });
  d.articles.forEach((a, i) => {
    if (a.title.trim().length < 3) out.news.push(`Article ${i + 1}: the title is required.`);
    if (!a.date) out.news.push(`Article ${i + 1}: choose a date.`);
    else add("news", dateProblem(a.date, "The date", NEWS_YEAR_MIN) && `Article ${i + 1}: ${dateProblem(a.date, "The date", NEWS_YEAR_MIN)}`);
  });
  d.media.forEach((m, i) => {
    if (m.title.trim().length < 3) out.news.push(`Coverage ${i + 1}: the headline is required.`);
    add("news", dateProblem(m.date, "The date", NEWS_YEAR_MIN) && `Coverage ${i + 1}: ${dateProblem(m.date, "The date", NEWS_YEAR_MIN)}`);
    if (!HTTPS.test(m.link)) out.news.push(`Coverage ${i + 1}: the link must start with https://.`);
  });

  // SEO
  if (d.seo.metaTitle.length > 70) out.seo.push("The meta title is over 70 characters.");
  if (d.seo.metaDescription.length > 170) out.seo.push("The meta description is over 170 characters.");

  return out;
}
