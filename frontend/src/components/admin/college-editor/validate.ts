import type { CollegeRecord } from "@/lib/api";

/*
  The checks the college editor runs as you type, one list per tab. They mirror the server's
  (routers/admin_college_record.py and schemas/college_detail.py), which has the last word: this
  is only so a mistake is shown on the tab it is on before Save, not after.
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
  | "seo";

const THIS_YEAR = new Date().getFullYear();
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SITE_OR_HTTPS = /^(\/[^\s]*|https:\/\/[^\s]+)?$/;
const HTTPS = /^(https:\/\/[^\s]+)?$/;
const RATIO = /^(\d{1,3}\s*:\s*\d{1,3})?$/;

export function problemsByTab(r: CollegeRecord): Record<TabId, string[]> {
  const out: Record<TabId, string[]> = {
    info: [], courses: [], reviews: [], admissions: [], placements: [], cutoffs: [], rankings: [],
    gallery: [], infrastructure: [], faculty: [], compare: [], qna: [], scholarships: [], news: [], seo: [],
  };
  const d = r.detail;

  // College Info
  if (r.name.trim().length < 2) out.info.push("The college name is required.");
  if (!r.state.trim()) out.info.push("Choose a state.");
  if (!r.city.trim()) out.info.push("The city is required.");
  if (!r.stream.trim()) out.info.push("Choose a category.");
  if (r.established !== null && (r.established < 1000 || r.established > THIS_YEAR)) out.info.push(`The year founded must be between 1000 and ${THIS_YEAR}.`);
  if (!SITE_OR_HTTPS.test(d.brochureUrl)) out.info.push("The brochure link must start with https:// or /.");

  // Courses
  const names = new Set<string>();
  r.courses.forEach((c, i) => {
    const label = c.name.trim() || `Programme ${i + 1}`;
    if (c.name.trim().length < 2) out.courses.push(`${label}: the programme name is required.`);
    if (!c.duration.trim()) out.courses.push(`${label}: the duration is required.`);
    if (!c.fees.trim()) out.courses.push(`${label}: the fees are required.`);
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
    if (!ISO.test(v.date)) out.reviews.push(`${label}: choose a date.`);
    if (v.body.trim().length < 3) out.reviews.push(`${label}: write the review.`);
  });

  // Placements
  const years = new Set<number>();
  r.placements.forEach((p) => {
    if (p.year < 1990 || p.year > THIS_YEAR + 1) out.placements.push(`${p.year}: the batch year must be between 1990 and ${THIS_YEAR + 1}.`);
    if (years.has(p.year)) out.placements.push(`${p.year} is listed more than once.`);
    years.add(p.year);
  });

  // Cut-offs
  const cuts = new Set<string>();
  r.cutoffs.forEach((c, i) => {
    const label = `${c.exam.trim() || "Exam"} / ${c.category.trim() || "category"}`;
    if (!c.exam.trim()) out.cutoffs.push(`Cut-off ${i + 1}: the exam is required.`);
    if (!c.score.trim()) out.cutoffs.push(`${label}: the score is required.`);
    const key = `${c.exam.trim().toLowerCase()}|${c.category.trim().toLowerCase()}`;
    if (c.exam.trim() && cuts.has(key)) out.cutoffs.push(`${label} is listed more than once.`);
    cuts.add(key);
  });

  // Rankings
  if ((r.rankingAuthority.trim() === "") !== (r.rankingRank === null)) out.rankings.push("Give both the ranking and its rank, or neither.");

  // Gallery
  d.gallery.forEach((g, i) => {
    if (g.alt.trim().length < 3) out.gallery.push(`Photo ${i + 1}: describe what it shows.`);
  });
  d.videos.forEach((v, i) => {
    if (v.title.trim().length < 2) out.gallery.push(`Video ${i + 1}: the title is required.`);
    if (!v.videoId) out.gallery.push(`Video ${i + 1}: paste a YouTube or Vimeo link.`);
  });

  // Faculty
  if (!RATIO.test(d.faculty.studentRatio)) out.faculty.push("Write the ratio as 15:1.");
  d.faculty.members.forEach((m, i) => {
    if (m.name.trim().length < 2) out.faculty.push(`Member ${i + 1}: the name is required.`);
  });

  // Compare
  if (d.similarSlugs.length > 8) out.compare.push("At most 8 colleges can be pinned.");

  // Q&A
  d.faqs.forEach((f, i) => {
    if (f.question.trim().length < 3) out.qna.push(`Question ${i + 1}: write the question.`);
    if (!f.answer.trim()) out.qna.push(`Question ${i + 1}: write the answer.`);
  });

  // News
  d.alerts.forEach((a, i) => {
    if (a.title.trim().length < 3) out.news.push(`Alert ${i + 1}: the notice is required.`);
    if (!ISO.test(a.date)) out.news.push(`Alert ${i + 1}: choose a date.`);
    if (!SITE_OR_HTTPS.test(a.link)) out.news.push(`Alert ${i + 1}: the link must start with / or https://.`);
  });
  d.articles.forEach((a, i) => {
    if (a.title.trim().length < 3) out.news.push(`Article ${i + 1}: the title is required.`);
    if (!ISO.test(a.date)) out.news.push(`Article ${i + 1}: choose a date.`);
  });
  d.media.forEach((m, i) => {
    if (m.title.trim().length < 3) out.news.push(`Coverage ${i + 1}: the headline is required.`);
    if (!HTTPS.test(m.link)) out.news.push(`Coverage ${i + 1}: the link must start with https://.`);
  });

  // SEO
  if (d.seo.metaTitle.length > 70) out.seo.push("The meta title is over 70 characters.");
  if (d.seo.metaDescription.length > 170) out.seo.push("The meta description is over 170 characters.");

  return out;
}
