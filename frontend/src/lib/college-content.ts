/**
 * The content the 4 Sep MOM adds to a college record: custom tabs, articles,
 * news/alerts, and the three media collections.
 *
 * Separate from lib/mock-data because these are editorial attachments to a
 * college rather than the college's own fields — they arrive and change on a
 * different rhythm, and once the API exists they are their own endpoints hung
 * off `/colleges/{slug}/…`. Relations are by slug, as everywhere else here.
 */

import { docFromParagraphs, emptyDoc, type RichTextDoc } from "@/lib/rich-text";

/* ------------------------------------------------------------------ *
 * Dynamic tabs (MOM §1.2)
 * ------------------------------------------------------------------ */

/**
 * A tab defined once, globally, and filled in per college — the 5 Sep decision
 * on §11 Q2.
 *
 * The alternative was letting each college invent its own tabs. That was
 * rejected because the public college page then has no predictable shape: the
 * in-page navigation, the comparison table and the SEO template all assume the
 * same sections exist across colleges, and per-college tabs make every one of
 * those conditional on a record.
 *
 * `isActive` rather than deleting: switching a tab off should hide it
 * everywhere without discarding the body copy every college has written into
 * it, which a delete would.
 */
export type TabTemplate = {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  /** Shown to editors under the field, so a tab's purpose survives its author. */
  hint?: string;
};

/** One college's body copy for one template. */
export type CollegeTabContent = {
  collegeSlug: string;
  tabSlug: string;
  body: RichTextDoc;
};

export const tabTemplates: TabTemplate[] = [
  {
    slug: "scholarships",
    label: "Scholarships",
    sortOrder: 1,
    isActive: true,
    hint: "Institute and government scholarships, eligibility and how to apply.",
  },
  {
    slug: "hostel-facilities",
    label: "Hostel & Facilities",
    sortOrder: 2,
    isActive: true,
    hint: "Accommodation, mess, sports, labs and campus amenities.",
  },
  {
    slug: "admission-process",
    label: "Admission Process",
    sortOrder: 3,
    isActive: true,
    hint: "Step-by-step process, documents required and key dates.",
  },
  {
    slug: "alumni",
    label: "Alumni",
    sortOrder: 4,
    isActive: false,
    hint: "Notable alumni and the alumni network. Switched off until enough colleges have copy.",
  },
];

export const collegeTabContent: CollegeTabContent[] = [
  {
    collegeSlug: "bengaluru-institute-of-management-studies",
    tabSlug: "scholarships",
    body: docFromParagraphs(
      "BIMS offers merit scholarships covering 25% to 100% of tuition, awarded on CAT percentile and the personal interview score. Around 18% of each incoming batch receives some form of award.",
      "Need-based support is assessed separately on family income, and can be combined with a merit award up to a full tuition waiver.",
    ),
  },
  {
    collegeSlug: "bengaluru-institute-of-management-studies",
    tabSlug: "hostel-facilities",
    body: docFromParagraphs(
      "On-campus accommodation is guaranteed for all first-year students, in twin-sharing rooms with attached bathrooms. The 2024 block added 240 single rooms allocated to second-year students by lottery.",
      "The campus has a 24-hour library, two computer labs, a gym, and courts for basketball, tennis and cricket.",
    ),
  },
  {
    collegeSlug: "eastwind-institute-of-management",
    tabSlug: "scholarships",
    body: docFromParagraphs(
      "Eastwind's scholarship pool is among the largest in the region, with awards funded by the alumni endowment. Full-tuition awards go to the top ten admitted candidates by composite score.",
    ),
  },
  {
    collegeSlug: "kaveri-institute-of-technology",
    tabSlug: "admission-process",
    body: docFromParagraphs(
      "Admission to B.Tech programmes is through KCET, COMEDK or JEE Main. Seats are split between the government quota, filled by KCET counselling, and the management quota, filled on COMEDK rank.",
      "Shortlisted candidates must produce the Class 12 marksheet, the entrance scorecard, a transfer certificate and a caste certificate where a reserved category is claimed.",
    ),
  },
  // Deliberately left with an untouched editor document: this is the case the
  // emptiness check has to get right, and the public page must not render a
  // blank "Hostel & Facilities" tab for this college.
  {
    collegeSlug: "horizon-school-of-business",
    tabSlug: "hostel-facilities",
    body: { type: "doc", content: [{ type: "paragraph" }] },
  },
];

export const activeTabTemplates = () =>
  tabTemplates.filter((tab) => tab.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

export const tabBody = (collegeSlug: string, tabSlug: string): RichTextDoc =>
  collegeTabContent.find((c) => c.collegeSlug === collegeSlug && c.tabSlug === tabSlug)?.body ??
  emptyDoc();

/* ------------------------------------------------------------------ *
 * Articles and news / alerts (MOM §1.2)
 * ------------------------------------------------------------------ */

/**
 * Articles and alerts are lists of dated records, not free text, which is why
 * they are their own shape rather than another tab template. An editor adding
 * the fifth news item should be adding a row, not scrolling to the bottom of a
 * document and matching the heading style of the four above it.
 */
export type CollegeArticle = {
  slug: string;
  collegeSlug: string;
  title: string;
  publishedAt: string;
  author: string;
  summary: string;
  body: RichTextDoc;
};

export type CollegeAlert = {
  id: string;
  collegeSlug: string;
  title: string;
  date: string;
  kind: "Admission" | "Exam" | "Result" | "Notice";
  /** Drives the highlight treatment on the public page. */
  isUrgent: boolean;
  link?: string;
};

export const collegeArticles: CollegeArticle[] = [
  {
    slug: "bims-placement-report-2025",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "BIMS Placement Report 2025: averages up 11%",
    publishedAt: "28 Aug 2026",
    author: "Editorial Desk",
    summary:
      "Consulting and analytics roles drove the increase, with the median package rising to ₹12.8 LPA.",
    body: docFromParagraphs(
      "The 2025 placement season closed with 94% of the batch placed, the highest figure BIMS has recorded. The average package rose 11% year on year to ₹14.2 LPA.",
      "Analytics roles accounted for nearly a third of offers, up from a fifth in 2024, reflecting the intake into the business analytics electives.",
    ),
  },
  {
    slug: "kaveri-new-cs-block",
    collegeSlug: "kaveri-institute-of-technology",
    title: "Kaveri opens new computer science block",
    publishedAt: "12 Aug 2026",
    author: "Campus Desk",
    summary: "The block adds six labs and a 300-seat auditorium ahead of the 2026 intake.",
    body: docFromParagraphs(
      "The new block was inaugurated ahead of the 2026 academic year and houses six teaching labs, a research wing and a 300-seat auditorium.",
    ),
  },
];

export const collegeAlerts: CollegeAlert[] = [
  {
    id: "bims-app-window-2026",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "MBA 2026 application window closes 30 September",
    date: "1 Sep 2026",
    kind: "Admission",
    isUrgent: true,
  },
  {
    id: "bims-interview-dates",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "Personal interview dates announced for the first shortlist",
    date: "22 Aug 2026",
    kind: "Notice",
    isUrgent: false,
  },
  {
    id: "kaveri-counselling-round-2",
    collegeSlug: "kaveri-institute-of-technology",
    title: "KCET counselling round 2 seat allotment published",
    date: "26 Aug 2026",
    kind: "Result",
    isUrgent: true,
  },
];

export const articlesFor = (collegeSlug: string) =>
  collegeArticles.filter((a) => a.collegeSlug === collegeSlug);

export const alertsFor = (collegeSlug: string) =>
  collegeAlerts.filter((a) => a.collegeSlug === collegeSlug);

/* ------------------------------------------------------------------ *
 * Media, gallery and video (MOM §1.3)
 * ------------------------------------------------------------------ */

/**
 * Three collections, not one uploader with a type flag.
 *
 * The MOM separates them because they are genuinely different things: media is
 * press and print coverage that carries a publication and an outbound link,
 * gallery is campus photography that needs alt text and a highlight flag, and
 * video is embedded rather than stored. Forcing all three through one shape
 * would mean two thirds of the fields blank on every record.
 */
export type MediaItem = {
  id: string;
  collegeSlug: string;
  title: string;
  publication: string;
  date: string;
  /** PDFs are first-class here — print coverage arrives as a scan. */
  fileType: "image" | "pdf";
  externalLink?: string;
};

export type GalleryImage = {
  id: string;
  collegeSlug: string;
  name: string;
  /** Required, not optional: image sitemaps are in signed scope. */
  alt: string;
  isHighlight: boolean;
};

export type CollegeVideo = {
  id: string;
  collegeSlug: string;
  title: string;
  /** Embedded, per the 5 Sep decision on §11 Q3 — no self-hosting. */
  provider: "youtube" | "vimeo";
  videoId: string;
};

/** Max highlights per college — the 5 Sep decision on §11 Q6. */
export const HIGHLIGHT_CAP = 5;

export const mediaItems: MediaItem[] = [
  {
    id: "bims-media-1",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "Ranked 34th in NIRF Management 2025",
    publication: "The Economic Times",
    date: "14 Jul 2026",
    fileType: "image",
    externalLink: "https://example.com/et-nirf-2025",
  },
  {
    id: "bims-media-2",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "Placement supplement — South India B-schools",
    publication: "Business Standard",
    date: "3 Jun 2026",
    fileType: "pdf",
  },
  {
    id: "kaveri-media-1",
    collegeSlug: "kaveri-institute-of-technology",
    title: "Engineering colleges expanding CS intake",
    publication: "Deccan Herald",
    date: "19 May 2026",
    fileType: "image",
    externalLink: "https://example.com/dh-cs-intake",
  },
];

export const galleryImages: GalleryImage[] = [
  { id: "bims-g1", collegeSlug: "bengaluru-institute-of-management-studies", name: "Main academic block", alt: "Four-storey academic block with a landscaped forecourt", isHighlight: true },
  { id: "bims-g2", collegeSlug: "bengaluru-institute-of-management-studies", name: "Central library", alt: "Students reading at long desks in a double-height library", isHighlight: true },
  { id: "bims-g3", collegeSlug: "bengaluru-institute-of-management-studies", name: "Auditorium", alt: "Tiered auditorium seating filled for a guest lecture", isHighlight: true },
  { id: "bims-g4", collegeSlug: "bengaluru-institute-of-management-studies", name: "Hostel courtyard", alt: "Open courtyard between two hostel blocks", isHighlight: false },
  { id: "bims-g5", collegeSlug: "bengaluru-institute-of-management-studies", name: "Sports ground", alt: "Cricket nets beside a floodlit sports ground", isHighlight: false },
  { id: "kaveri-g1", collegeSlug: "kaveri-institute-of-technology", name: "Computer science block", alt: "Glass-fronted computer science building", isHighlight: true },
  { id: "kaveri-g2", collegeSlug: "kaveri-institute-of-technology", name: "Electronics lab", alt: "Students at workbenches in an electronics laboratory", isHighlight: false },
];

export const collegeVideos: CollegeVideo[] = [
  {
    id: "bims-v1",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "Campus tour 2026",
    provider: "youtube",
    videoId: "dQw4w9WgXcQ",
  },
  {
    id: "bims-v2",
    collegeSlug: "bengaluru-institute-of-management-studies",
    title: "Placement season: what recruiters look for",
    provider: "youtube",
    videoId: "aqz-KE-bpKQ",
  },
  {
    id: "kaveri-v1",
    collegeSlug: "kaveri-institute-of-technology",
    title: "Inside the new CS block",
    provider: "vimeo",
    videoId: "76979871",
  },
];

export const mediaFor = (collegeSlug: string) =>
  mediaItems.filter((m) => m.collegeSlug === collegeSlug);

export const galleryFor = (collegeSlug: string) =>
  galleryImages.filter((g) => g.collegeSlug === collegeSlug);

/** Highlights only, capped — the frontend contract for the detail-page hero. */
export const highlightsFor = (collegeSlug: string) =>
  galleryFor(collegeSlug)
    .filter((g) => g.isHighlight)
    .slice(0, HIGHLIGHT_CAP);

export const videosFor = (collegeSlug: string) =>
  collegeVideos.filter((v) => v.collegeSlug === collegeSlug);

/** Embed and thumbnail URLs, so the provider branch lives in one place. */
export const videoEmbedUrl = (video: CollegeVideo) =>
  video.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${video.videoId}`
    : `https://player.vimeo.com/video/${video.videoId}`;

export const videoWatchUrl = (video: CollegeVideo) =>
  video.provider === "youtube"
    ? `https://www.youtube.com/watch?v=${video.videoId}`
    : `https://vimeo.com/${video.videoId}`;

/**
 * Parses a pasted URL into provider + id, for the admin's URL field.
 *
 * Accepts what an editor will actually paste: a watch URL, a share link, an
 * embed URL, or a bare id. Returns null rather than guessing when nothing
 * matches, so the form can say so instead of storing a broken embed.
 */
export function parseVideoUrl(
  input: string,
): { provider: CollegeVideo["provider"]; videoId: string } | null {
  const url = input.trim();
  if (!url) return null;

  const youtube =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (youtube) return { provider: "youtube", videoId: youtube[1] };

  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return { provider: "vimeo", videoId: vimeo[1] };

  // A bare YouTube id is 11 chars; a bare Vimeo id is digits.
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return { provider: "youtube", videoId: url };
  if (/^\d{6,}$/.test(url)) return { provider: "vimeo", videoId: url };

  return null;
}
