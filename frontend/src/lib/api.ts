/**
 * API client for the FastAPI backend.
 *
 * All fetches run in Server Components (async RSC) — data is fetched directly
 * from the FastAPI origin, never via a Next.js Route Handler in between.
 * (Next.js 16 docs explicitly recommend this to avoid the extra HTTP round-trip
 * and build-time failures that occur when Server Components call Route Handlers.)
 */

import type { RichTextDoc } from "@/lib/rich-text";
import type { HomeCopy } from "@/lib/home-copy";
import type { MockTest, TestSummary } from "@/lib/practice-data";
import type { AttemptResult } from "@/lib/practice-attempt";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Fetch primitives ───────────────────────────────────────────────────────

type ApiResponse<T> = { success: true; data: T };
type ApiListResponse<T> = {
  success: true;
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

/**
 * A non-2xx response from the API. Carries the status so a page can turn a 404
 * into notFound() while letting every other failure surface as an error.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Public reads are cached for a minute. Prerendered pages then build from the
 * API, and an edit reaches the public site within a minute. Admin reads bypass
 * this cache (see adminGetColleges and adminListLeads).
 */
const PUBLIC_REVALIDATE_SECONDS = 60;

/**
 * `next build` prerenders every college and exam page from the live API. A deploy that restarts the
 * backend leaves the API answering 502 for up to a minute, so while building each read waits for it
 * (about a minute and a half in all) instead of failing the build. Requests from a running site keep the short retry.
 */
const BUILDING = process.env.NEXT_PHASE === "phase-production-build";
const DEFAULT_RETRIES = BUILDING ? 8 : 2;
const retryDelay = (attempt: number) => (BUILDING ? Math.min(2000 * 2 ** attempt, 15000) : 600 * (attempt + 1));

async function apiFetch<T>(path: string, retries = DEFAULT_RETRIES): Promise<T> {
  const url = `${API_BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } });
      if (!res.ok) {
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay(attempt)));
          continue;
        }
        throw new ApiError(res.status, `API ${res.status} on ${url}`);
      }
      const json = (await res.json()) as ApiResponse<T>;
      return json.data;
    } catch (err) {
      if (attempt < retries && !(err instanceof ApiError && err.status === 404)) {
        await new Promise((r) => setTimeout(r, retryDelay(attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new ApiError(500, `API failed on ${url}`);
}

async function apiListFetch<T>(
  path: string,
  retries = DEFAULT_RETRIES
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const url = `${API_BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } });
      if (!res.ok) {
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay(attempt)));
          continue;
        }
        throw new ApiError(res.status, `API ${res.status} on ${url}`);
      }
      const json = (await res.json()) as ApiListResponse<T>;
      return { data: json.data, meta: json.meta };
    } catch (err) {
      if (attempt < retries && !(err instanceof ApiError && err.status === 404)) {
        await new Promise((r) => setTimeout(r, retryDelay(attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new ApiError(500, `API failed on ${url}`);
}

// ── Types — mirror of frontend mock-data.ts and articles-data.ts ──────────

export type Ranking = { authority: string; rank: number };
export type RatingBreakdown = { label: string; score: number };
export type Course = {
  name: string;
  /** From the Specialisations list; empty when the programme has none. */
  specialisation?: string;
  duration: string;
  mode: string;
  fees: string;
  exams: string[];
  /** "Graduation with 50%": shown under the programme. */
  eligibility?: string;
  seats?: number | null;
  /** Also taught online, with its own length and fees. */
  onlineOffered?: boolean;
  onlineDuration?: string;
  onlineFees?: string;
};
/** One row of a year's placements by category, course and specialisation. A blank package is "not given". */
export type PlacementBreakdown = {
  category: string;
  course: string;
  /** Empty: the course as a whole. */
  specialisation: string;
  average: string;
  highest: string;
  /** How many students were placed, and how many sat for placement. */
  placed: number | null;
  students: number | null;
};
export type Placement = {
  /** The year the batch began. Empty or absent: a single year. */
  yearStart?: number | null;
  /** The year the batch ended. */
  year: number;
  average: string;
  median: string;
  highest: string;
  topRecruiters: string[];
  /** The same companies with their logos, in the same order (the college page only). */
  recruiters?: RecruiterBrief[];
  /** Share of the batch placed, 0-100. */
  placedPercent?: number | null;
  /** By category, course and specialisation, as entered in the admin. */
  breakdown?: PlacementBreakdown[];
};
/** `category` is the caste category (General, OBC...). `course` and `specialisation` are empty for every programme. */
export type Cutoff = { exam: string; category: string; course?: string; specialisation?: string; score: string };
export type Review = {
  author: string;
  course: string;
  batch: string;
  verified: boolean;
  date: string;
  rating: number;
  body: string;
};

export type CollegeStatus = "draft" | "published" | "archived";

export type College = {
  slug: string;
  name: string;
  /** The default priority set in the admin: 1 is shown first. Absent: after those that have one, by NIRF rank. */
  priority?: number | null;
  /** Its NIRF rank, apart from `ranking` (which a ranking-list page swaps for the list's own rank). */
  nirfRank?: number | null;
  /** The newest placement year's average and highest package, for the listing card. */
  placementAverage?: string;
  placementHighest?: string;
  /** Every ranking list it is in (the list's name with its year, and its place), best first. */
  allRankings?: { name: string; rank: number; slug?: string; authority?: string; stream?: string; score?: string }[];
  city: string;
  state: string;
  /** Only published colleges reach the public site; the admin list also carries drafts and archived ones. */
  status?: CollegeStatus;
  ownership: "Private" | "Government" | "Deemed";
  stream: string;
  ranking: Ranking;
  rating: number;
  reviewCount: number;
  coursesOffered: number;
  feesRange: string;
  examsAccepted: string[];
  tags: string[];
  approvals: string[];
  courses: Course[];
  // Detail-only fields (present on GET /colleges/:slug)
  established?: number;
  about?: string;
  ratingBreakdown?: RatingBreakdown[];
  /** Null when the college has no placement record. */
  placement?: Placement | null;
  cutoffs?: Cutoff[];
  reviews?: Review[];
  /** Card and hero photo: /images/... or /api/uploads/... Empty: no photo. */
  image?: string;
  /** The college's logo and its brochure link. Empty: none uploaded. */
  logo?: string;
  brochureUrl?: string;
  /** Featured in the admin, and how many times the page has been viewed. */
  isFeatured?: boolean;
  viewCount?: number;
};

export type Exam = {
  slug: string;
  name: string;
  /** Where space is tight. Empty or absent: the full name. */
  shortName?: string;
  conductingBody: string;
  level: "National" | "State";
  description: string;
  registrationCloses: string;
  examDate: string;
  // Extended detail fields (optional — not always present in list views)
  mode?: string;
  frequency?: string;
  applicationFee?: string;
  officialSite?: string;
  durationMinutes?: number;
  sections?: string[];
  /** The category the exam is listed under (a name from the Fields list). Empty or absent: none. */
  stream?: string;
  /** Detail page content, written in the admin. Empty or absent: the page leaves the section out. */
  eligibility?: string;
  syllabus?: string;
  faqs?: ExamFaq[];
  /** Card photo: /images/... or /api/uploads/... Empty: no photo. */
  image?: string;
  /** The badge on the card: Upcoming, Live, Expired or any words. Empty or absent: no badge. */
  statusLabel?: string;
};

export type ExamFaq = { question: string; answer: string };

export type Location = {
  slug: string;
  name: string;
  state: string;
  collegeCount: number;
};

/** One hero slide. Empty `image`: the slide shows the built-in illustration. */
export type HeroItem = {
  id: string;
  headline: string;
  subheadline: string;
  image: string;
  imageAlt: string;
};

/** One disc in the homepage Fields grid. `icon` is a key from lib/field-icons. */
export type HomeField = {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  badge: string;
  avgCtc: string;
};

/** A course category and its fee range, shown as a tile on a destination card. */
export type CourseFee = { category: string; fees: string };

/** A homepage carousel card: the directory entry plus what the card shows. */
/** A category a card offers, with the colleges the admin picked under it. */
export type FeaturedStream = { stream: string; name: string; colleges: { slug: string; name: string }[] };

/** The college a card highlights (sponsors): its own photo and the figures drawn from it. */
export type HighlightCollege = {
  slug: string;
  name: string;
  image?: string;
  rankingAuthority?: string | null;
  rank?: number | null;
  rating?: number | null;
  avgPackage?: string;
  coursesOffered?: number;
  city?: string;
  state?: string;
  stream?: string;
  established?: number | null;
  ownership?: string;
  /** A short plain-text excerpt of the college's About text. */
  about?: string;
};

export type HomeLocation = Location & {
  /** The highlighted college. Its photo is the card's photo unless `image` holds one uploaded for the card. */
  highlightCollege?: HighlightCollege | null;
  /** The college the card's photo shows, named in a caption on it. Empty or absent: no caption. */
  imageCaption?: string;
  /** Figures over the photo. Absent or empty: worked out from the location's colleges. */
  nirfRank?: number | null;
  otherRankLabel?: string;
  otherRank?: number | null;
  topRating?: number | null;
  /** Categories and colleges picked in the admin. Empty: worked out from the city's colleges. */
  featured?: FeaturedStream[];
  /** Tags on the card, in label order. */
  labels: string[];
  /** Up to three course categories with their fee ranges. */
  courseFees: CourseFee[];
  description: string;
  avgPackage: string;
  /** /images/... (shipped with the site) or /api/uploads/... (uploaded in the admin). Empty: no photo. */
  image: string;
};

export type Article = {
  /** The article's picture: /images/... or /api/uploads/... Empty or absent: none. */
  image?: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author?: string;
  category?: string;
  readMinutes?: number;
  // Detail only
  body?: string;
  /** The page as sections of blocks. Empty or absent: `body` is shown as paragraphs. */
  sections?: import("@/lib/article-sections").ArticleSection[];
  relatedCollegeSlugs?: string[];
};

export type OnlineInfo = { duration: string; fees: string; feesNote: string };
export type OnCampusInfo = { duration: string; fees: string };
export type RecommendedProgram = {
  slug: string;
  name: string;
  university: string;
  universitySlug: string;
  online: OnlineInfo;
  onCampus: OnCampusInfo;
  /** The programme's own photo: /images/... or /api/uploads/... Empty or absent: the shared set. */
  image?: string;
  /** Every institution that offers it (same name), the one asked for first. Present on the detail read only. */
  institutions?: ProgramInstitution[];
};

export type ProgramInstitution = {
  slug: string;
  university: string;
  universitySlug: string;
  /** The institution has a page of its own on the site. */
  inDirectory: boolean;
  city?: string | null;
  state?: string | null;
  ownership?: string | null;
  rankingAuthority?: string | null;
  rankingRank?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  online: { duration: string | null; fees: string | null; feesNote: string | null };
  onCampus: { duration: string | null; fees: string | null };
};

export type CareerPanelLink = { label: string; href: string };
export type CareerPanel = {
  title: string;
  /** The category tab the panel shows under. Empty or absent: under every tab. */
  category?: string;
  viewAllHref: string;
  links: CareerPanelLink[];
};

export type DataHighlightLink = { label: string; href: string };
export type DataHighlight = {
  slug: string;
  title: string;
  description: string;
  links: DataHighlightLink[];
};

export type RecommendedUniversity = {
  slug: string;
  name: string;
  city: string;
  state: string;
  /** The college's own photo: /images/... or /api/uploads/... Empty or absent: the shared set. */
  image?: string;
  /** "College" or "University". Absent on an API older than the type field. */
  institutionType?: string;
  /** The category it is listed under. */
  stream?: string;
};

/** homeStreams now has slug so it matches mock-data.ts homeStreams */
export type StreamCount = { slug: string; name: string; count: number };

export type HomeData = {
  homeCopy: HomeCopy;
  featuredColleges: College[];
  featuredExams: Exam[];
  locations: Location[];
  /** The cards the carousel shows, in order. Absent from an API older than the card editor. */
  homeLocations?: HomeLocation[];
  articles: Article[];
  recommendedPrograms: RecommendedProgram[];
  careerPanels: CareerPanel[];
  recommendedUniversities: RecommendedUniversity[];
  dataHighlights: DataHighlight[];
  streams: StreamCount[];
  /** The Fields grid, in the admin's order. Absent from an API older than the field editor. */
  fields?: HomeField[];
  /** The active hero slides, in order. One shows plain, several rotate. */
  heroItems?: HeroItem[];
};

// ── Home ──────────────────────────────────────────────────────────────────

/** Single call that populates the entire home page. */
export async function getHomeData(): Promise<HomeData> {
  return apiFetch<HomeData>("/home");
}

// ── Colleges ──────────────────────────────────────────────────────────────

/**
 * A college from the detail endpoint: the list fields plus the detail-only ones.
 * `placement` is null for a college with no placement record.
 */
export type FacultyMember = { name: string; designation: string; department: string; qualification: string };
export type CollegeFaculty = { count: number | null; studentRatio: string; phdPercent: number | null; members: FacultyMember[] };
/**
 * A question and answer on a college's Q&A tab. One the editor wrote has a question and an answer. One with `auto`
 * set (the key of a question the site writes itself: courses, exams, placements, cutoffs, approved, reviews)
 * adjusts that question instead: `active` false hides it, and a question and answer replace the generated wording.
 * `active` is true when absent.
 */
export type CollegeFaq = { question: string; answer: string; active?: boolean; auto?: string };
export type CollegeGalleryItem = { src: string; alt: string; name: string; highlight: boolean };
export type CollegeVideoItem = { title: string; provider: "youtube" | "vimeo"; videoId: string };
export type CollegeMediaItem = { title: string; publication: string; date: string; link: string };
export type CollegeAlert = { title: string; date: string; kind: "Admission" | "Exam" | "Result" | "Notice"; isUrgent: boolean; link: string };
export type CollegeArticle = { title: string; date: string; author: string; summary: string; body: string };

/** A college's whole page: the record, and everything an editor writes for it in the admin. */
export type CollegeDetail = Omit<College, "ratingBreakdown" | "placement" | "cutoffs" | "reviews"> & {
  ratingBreakdown: RatingBreakdown[];
  placement: Placement | null;
  /** Every year's placement record, newest first. */
  placements: Placement[];
  cutoffs: Cutoff[];
  reviews: Review[];
  /** "BIMS Bengaluru": the masthead title. Empty: initials and city. */
  shortName: string;
  /** After the short name in the page heading. Empty: a default. */
  tagline: string;
  /** The street or area before the city. */
  locality: string;
  logo: string;
  /** Empty: the Brochure button opens the enquiry form. */
  brochureUrl: string;
  /** When the record was last saved (ISO date). */
  updatedAt: string;
  faculty: CollegeFaculty;
  faqs: CollegeFaq[];
  /** Colleges pinned as similar. Empty: the nearest by stream and rank. */
  similarSlugs: string[];
  seo: { metaTitle: string; metaDescription: string };
  gallery: CollegeGalleryItem[];
  videos: CollegeVideoItem[];
  media: CollegeMediaItem[];
  alerts: CollegeAlert[];
  articles: CollegeArticle[];
  /** Rich-text documents for the written sections (Admissions, Infrastructure, Scholarships), by template slug. */
  tabs: Record<string, import("@/lib/rich-text").RichTextDoc>;
  /** The banner over each written section (label, heading, icon), by the same slugs. Empty fields mean the default. */
  tabHeaders?: Record<string, TabHeaderConfig>;
};

export type TabHeaderConfig = { label: string; heading: string; icon: string };

export type CollegeParams = {
  page?: number;
  limit?: number;
  stream?: string;
  /** Course name, e.g. "MBA". Matches the course and its variants. */
  course?: string;
  city?: string;
  state?: string;
  ownership?: string;
  sort?: string;
  featured?: boolean;
  q?: string;
  exam?: string;
  approval?: string;
  ranking_max?: number;
  ranking_list?: string;
  mode?: string;
  specialisation?: string;
  /** UG | PG | Doctorate */
  level?: string;
  /** Degree | Diploma */
  credential?: string;
  /** Lowest fee bounds, in lakh rupees: fees_min <= fee < fees_max. */
  fees_min?: number;
  fees_max?: number;
  min_rating?: number;
  /** A collection's slug: a hand-picked one lists only its own colleges. */
  collection?: string;
  /** A header-menu link, "<category id>:<link key>": the institutes the admin left out of it stay out. */
  menu?: string;
};

/** College listing with optional filters / search / pagination. */
export async function getColleges(
  params?: CollegeParams
): Promise<{ data: College[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.stream) qs.set("stream", params.stream);
  if (params?.course) qs.set("course", params.course);
  if (params?.city) qs.set("city", params.city);
  if (params?.state) qs.set("state", params.state);
  if (params?.ownership) qs.set("ownership", params.ownership);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.featured !== undefined) qs.set("featured", String(params.featured));
  if (params?.q) qs.set("q", params.q);
  if (params?.exam) qs.set("exam", params.exam);
  if (params?.approval) qs.set("approval", params.approval);
  if (params?.ranking_max) qs.set("ranking_max", String(params.ranking_max));
  if (params?.ranking_list) qs.set("ranking_list", params.ranking_list);
  if (params?.mode) qs.set("mode", params.mode);
  if (params?.specialisation) qs.set("specialisation", params.specialisation);
  if (params?.level) qs.set("level", params.level);
  if (params?.credential) qs.set("credential", params.credential);
  if (params?.fees_min !== undefined) qs.set("fees_min", String(params.fees_min));
  if (params?.fees_max !== undefined) qs.set("fees_max", String(params.fees_max));
  if (params?.min_rating) qs.set("min_rating", String(params.min_rating));
  if (params?.collection) qs.set("collection", params.collection);
  if (params?.menu) qs.set("menu", params.menu);
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<College>(`/colleges${query}`);
}

/** What the listing's filter menus offer, read from the directory. */
export type CollegeFacets = {
  /** The categories colleges are listed under. */
  streams?: string[];
  cities: string[];
  exams: string[];
  approvals: string[];
  modes: string[];
  courses: string[];
  specialisations: string[];
  /** The categories each course sits under, by course name. */
  courseStreams?: Record<string, string[]>;
  /** The courses each specialisation sits under, by specialisation name. */
  specialisationCourses?: Record<string, string[]>;
};

export async function getCollegeFacets(): Promise<CollegeFacets> {
  return apiFetch<CollegeFacets>("/colleges/facets");
}

/** Full college detail by slug (includes courses, placement, cutoffs, reviews). */
/**
 * A college's page record with every editor-written part present.
 *
 * The site and the API are deployed separately, so for a while the site can be talking to an
 * API that does not carry the newer fields yet (the faculty roster, gallery, Q&A and so on).
 * Each missing part is filled with its empty value, so a page renders as "nothing published
 * yet" instead of failing, and a build never depends on which was deployed first.
 */
function withCollegeDefaults(raw: Partial<CollegeDetail> & Pick<CollegeDetail, "slug" | "name">): CollegeDetail {
  const college = raw as CollegeDetail;
  return {
    ...college,
    courses: raw.courses ?? [],
    cutoffs: raw.cutoffs ?? [],
    reviews: raw.reviews ?? [],
    ratingBreakdown: raw.ratingBreakdown ?? [],
    placement: raw.placement ?? null,
    placements: raw.placements ?? (raw.placement ? [raw.placement] : []),
    shortName: raw.shortName ?? "",
    tagline: raw.tagline ?? "",
    locality: raw.locality ?? "",
    logo: raw.logo ?? "",
    brochureUrl: raw.brochureUrl ?? "",
    updatedAt: raw.updatedAt ?? "",
    faculty: raw.faculty ?? { count: null, studentRatio: "", phdPercent: null, members: [] },
    faqs: raw.faqs ?? [],
    similarSlugs: raw.similarSlugs ?? [],
    seo: raw.seo ?? { metaTitle: "", metaDescription: "" },
    gallery: raw.gallery ?? [],
    videos: raw.videos ?? [],
    media: raw.media ?? [],
    alerts: raw.alerts ?? [],
    articles: raw.articles ?? [],
    tabs: raw.tabs ?? {},
    tabHeaders: raw.tabHeaders ?? {},
  };
}

export async function getCollege(slug: string): Promise<CollegeDetail> {
  return withCollegeDefaults(await apiFetch<CollegeDetail>(`/colleges/${slug}`));
}

/** College by slug, or null when the API has no such college. Other errors still throw. */
export async function getCollegeOrNull(slug: string): Promise<CollegeDetail | null> {
  try {
    return await getCollege(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Related colleges for the sidebar (same stream, different college). */
export async function getRelatedColleges(
  slug: string,
  limit = 3
): Promise<College[]> {
  try {
    return await apiFetch<College[]>(`/colleges/${encodeURIComponent(slug)}/related?limit=${limit}`);
  } catch {
    return [];
  }
}

/** Similar colleges for the peer-grid on the college detail page. */
export async function getSimilarColleges(
  slug: string,
  limit = 8
): Promise<College[]> {
  try {
    return await apiFetch<College[]>(`/colleges/similar?slug=${encodeURIComponent(slug)}&limit=${limit}`);
  } catch {
    return [];
  }
}

/** All college slugs — used by generateStaticParams at build time. */
export async function getCollegeSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/colleges/slugs");
}

// ── Exams ─────────────────────────────────────────────────────────────────

export type ExamParams = {
  page?: number;
  limit?: number;
  stream?: string;
  level?: string;
  featured?: boolean;
  q?: string;
};

export async function getExams(
  params?: ExamParams
): Promise<{ data: Exam[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.stream) qs.set("stream", params.stream);
  if (params?.level) qs.set("level", params.level);
  if (params?.featured !== undefined) qs.set("featured", String(params.featured));
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<Exam>(`/exams${query}`);
}

export async function getExam(slug: string): Promise<Exam> {
  return apiFetch<Exam>(`/exams/${slug}`);
}

/** All exam slugs — used by generateStaticParams. */
export async function getExamSlugs(): Promise<string[]> {
  const res = await getExams({ limit: 100 });
  return res.data.map((e) => e.slug);
}

// ── Locations ─────────────────────────────────────────────────────────────

export async function getLocations(): Promise<Location[]> {
  return apiFetch<Location[]>("/locations");
}

export async function getLocation(slug: string): Promise<Location> {
  return apiFetch<Location>(`/locations/${slug}`);
}

// ── Articles ──────────────────────────────────────────────────────────────

export async function getArticles(
  params?: { page?: number; limit?: number; /** Only the articles written about this college. */ college?: string }
): Promise<{ data: Article[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.college) qs.set("college", params.college);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<Article>(`/articles${query}`);
}

export async function getArticle(slug: string): Promise<Article> {
  return apiFetch<Article>(`/articles/${slug}`);
}

/** All article slugs — used by generateStaticParams. */
export async function getArticleSlugs(): Promise<string[]> {
  const res = await getArticles({ limit: 100 });
  return res.data.map((a) => a.slug);
}

// ── Mutations (POST — used from Client Components / Route Handlers) ────────

export type LeadInput = {
  name: string;
  phone: string;
  email?: string;
  collegeSlug?: string;
  type: "callback" | "counselling" | "brochure" | "enquiry";
  stream?: string;
  city?: string;
  message?: string;
  programName?: string;
  source?: string;
  sourceUrl?: string;
  consent?: boolean;
  visitorId?: string;
};

/**
 * Submit a lead (callback, counselling, brochure, enquiry). With a student's
 * token the API ties the lead to their account; without one it stays anonymous.
 */
export async function submitLead(
  data: LeadInput,
  token?: string | null
): Promise<{ id: string; message: string; repeat: boolean }> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!json?.success) throw new Error(json?.error?.message ?? "Failed to submit");
  return json.data;
}

/** Subscribe to the newsletter. */
export async function subscribeNewsletter(
  email: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Subscription failed");
  return json.data;
}

/** Register a new user account. */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  marketingConsent?: boolean;
}): Promise<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!json?.success) {
    // The caller tells a taken email apart from other failures by this code.
    const error = new Error(json?.error?.message ?? "Registration failed") as Error & { code?: string };
    error.code = json?.error?.code;
    throw error;
  }
  return json.data;
}

/** Full-text search across colleges, exams, locations. */
export type SearchResults = {
  colleges: { slug: string; name: string; city: string; stream: string }[];
  exams: { slug: string; name: string }[];
  locations: { slug: string; name: string }[];
};

export async function search(q: string): Promise<SearchResults> {
  return apiFetch<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
}

// ── Course Catalogue types ────────────────────────────────────────────────

export type Specialisation = {
  slug: string;
  name: string;
  courseSlug: string;
  courseName: string;
  stream: string;
  duration?: string;
  averageFees?: string;
  collegeCount: number;
  about?: string;
};

export type CourseCatalogue = {
  slug: string;
  name: string;
  fullName: string;
  level: "UG" | "PG" | "Diploma" | "Doctorate";
  stream: string;
  duration: string;
  modes: string[];
  eligibility?: string;
  averageFees?: string;
  examsAccepted: string[];
  collegeCount: number;
  about?: string;
  /** Set in the admin: 1 first. */
  priority?: number | null;
  // Detail only
  specialisations?: Specialisation[];
};

// ── Ranking types ─────────────────────────────────────────────────────────

export type RankingEntry = { collegeSlug: string; rank: number; score?: string };
export type RankingList = {
  slug: string;
  name: string;
  /** Where space is tight. Empty or absent: the full name. */
  shortName?: string;
  authority: string;
  year: number;
  stream?: string;
  entries: RankingEntry[];
};

// ── Auth types ────────────────────────────────────────────────────────────

export type AuthUser = { id: string; name: string; email: string; role: string };
export type AuthResult = { accessToken: string; user: AuthUser; isNewUser?: boolean; mustChangePassword?: boolean };

// ── Course Catalogue functions ────────────────────────────────────────────

export async function getCourses(params?: {
  page?: number;
  limit?: number;
  stream?: string;
  level?: string;
}): Promise<{ data: CourseCatalogue[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page)   qs.set("page",   String(params.page));
  if (params?.limit)  qs.set("limit",  String(params.limit));
  if (params?.stream) qs.set("stream", params.stream);
  if (params?.level)  qs.set("level",  params.level);
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<CourseCatalogue>(`/courses${query}`);
}

export async function getCourse(slug: string): Promise<CourseCatalogue> {
  return apiFetch<CourseCatalogue>(`/courses/${slug}`);
}

/** An active programme, or null for an unknown or switched-off one. */
export async function getProgram(slug: string): Promise<RecommendedProgram | null> {
  try {
    return await apiFetch<RecommendedProgram>(`/programs/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCourseSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/courses/slugs");
}

// ── Rankings functions ────────────────────────────────────────────────────

export async function getRankings(): Promise<RankingList[]> {
  return apiFetch<RankingList[]>("/rankings");
}

export async function getRanking(slug: string): Promise<RankingList> {
  return apiFetch<RankingList>(`/rankings/${slug}`);
}

// ── Auth mutations ────────────────────────────────────────────────────────

/** Login — returns accessToken + user. */
export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Login failed");
  return json.data;
}

/** Exchange a Google ID token for our own access token. Creates the account on first use. */
export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!json?.success) throw new Error(json?.error?.message ?? "Google sign-in failed");
  return json.data;
}

/** The signed-in student's own record. */
export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  authProvider: "password" | "google";
  city: string | null;
  state: string | null;
  preferredStream: string | null;
  targetExam: string | null;
  marketingConsent: boolean;
  /** For a college admin: the college they look after. */
  collegeSlug: string | null;
  mustChangePassword: boolean;
  /** False for an account made with Google that has not added a password yet. */
  hasPassword: boolean;
};

export type ProfileUpdate = Partial<
  Pick<Profile, "name" | "phone" | "city" | "state" | "preferredStream" | "targetExam" | "marketingConsent">
>;

export async function getMe(token: string): Promise<Profile> {
  const res = await fetch(`${API_BASE}/me`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} on /me`);
  return ((await res.json()) as ApiResponse<Profile>).data;
}

export type MyReply = { id: string; authorName: string; body: string; createdAt: string | null; read: boolean };

export type MyLead = {
  id: string;
  type: string;
  status: LeadStatus;
  collegeSlug: string | null;
  programName: string | null;
  stream: string | null;
  city: string | null;
  message: string | null;
  source: string | null;
  createdAt: string | null;
  replies: MyReply[];
};

export type MyActivity = {
  kind: "account_created" | "login" | "enquiry_sent" | "reply_received" | "page_view" | "click";
  title: string;
  detail: string | null;
  href: string | null;
  at: string | null;
};

async function meGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} on ${path}`);
  return ((await res.json()) as ApiResponse<T>).data;
}

export const getMyLeads = (token: string) => meGet<MyLead[]>(token, "/me/leads");
export const getMyActivity = (token: string) => meGet<MyActivity[]>(token, "/me/activity");

export async function markRepliesRead(token: string): Promise<void> {
  await fetch(`${API_BASE}/me/replies/read`, { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
}

export async function updateMe(token: string, data: ProfileUpdate): Promise<Profile> {
  const res = await fetch(`${API_BASE}/me`, {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Could not save your details");
  return json.data;
}

/** Refresh access token using an existing (still-valid) token. */
export async function refreshToken(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Token refresh failed");
  return json.data.accessToken;
}

// ── Study abroad ─────────────────────────────────────────────────────────

export type StudyAbroadDestination = {
  slug: string;
  country: string;
  tagline: string;
  /** Rough count of institutions that admit international students. */
  universities: string;
  /** Annual tuition, indicative range, in INR. */
  tuition: string;
  /** Annual living costs, indicative range, in INR. */
  living: string;
  postStudyWork: string;
  intakes: string;
  popularCourses: string[];
};

export type StudyAbroadStep = { title: string; window: string; detail: string };

export type StudyAbroadTest = {
  name: string;
  purpose: string;
  validity: string;
  /** Internal exam page where one exists, otherwise null. */
  href: string | null;
};

export type StudyAbroadFaq = { question: string; answer: string };

export type StudyAbroadContent = {
  figuresReviewed: string;
  destinations: StudyAbroadDestination[];
  applicationSteps: StudyAbroadStep[];
  admissionTests: StudyAbroadTest[];
  faqs: StudyAbroadFaq[];
};

/** The whole study-abroad page. Figures are indicative; the reviewed date is shown with them. */
export async function getStudyAbroad(): Promise<StudyAbroadContent> {
  return apiFetch<StudyAbroadContent>("/study-abroad");
}

// ── Collections ───────────────────────────────────────────────────────────

/** The listing filters a collection presets. Named as the colleges listing names them; absent means "any". */
export type CollectionFilters = {
  stream?: string;
  course?: string;
  specialisation?: string;
  city?: string;
  ownership?: string;
  level?: string;
  credential?: string;
  /** Mode of study. */
  mode?: string;
  exam?: string;
  approval?: string;
};

export type CollectionPlacements = {
  homepage?: { order: number; limit: number; isVisible: boolean };
  footer?: { column: string; order: number };
};

export type CollectionSeo = {
  metaTitle: string;
  metaDescription: string;
  canonical?: string;
  intro: RichTextDoc;
  faqs: { question: string; answer: string }[];
};

export type Collection = {
  id: string;
  slug: string;
  title: string;
  heading: string;
  subheading: string;
  /** "filters": every college matching `filters` and the ranking list. "picked": only `collegeSlugs`, in that order. */
  /** Who the page says wrote it. An empty name falls back to the listing's own author. */
  author: { name: string; role: string; photo: string };
  membership: "filters" | "picked";
  filters: CollectionFilters;
  collegeSlugs: string[];
  rankingListSlug: string;
  /** The header-menu category it sits in (a category id), if any. */
  menuGroup?: string | null;
  /** The colleges listing it opens, with its filters preset: /colleges?city=Pune&collection=slug. */
  href: string;
  seo: CollectionSeo;
  placements: CollectionPlacements;
  isPublished: boolean;
  updatedAt: string;
};

/** `colleges` is every college of the section; `limit` is how many cards each category tab shows. */
export type CollectionBand = {
  collection: Collection;
  /** The first page of every category. The rest are fetched as the slider moves. */
  colleges: College[];
  /** Cards per page. */
  limit?: number;
  /** How many colleges each category holds in all. */
  totals?: Record<string, number>;
};

export type FooterColumn = {
  title: string;
  links: { label: string; href: string; order: number }[];
};

export type CollectionPagePayload = {
  collection: Collection;
  colleges: College[];
  related: { slug: string; title: string; href: string; count: number }[];
  canonical: string;
};

/** Homepage bands: published, visible, in editor order, each with its colleges. */
export async function getCollectionBands(): Promise<CollectionBand[]> {
  return apiFetch<CollectionBand[]>("/collections/homepage");
}

/** One page of a homepage section's colleges, of one category or all. */
export type BandPage = { colleges: College[]; page: number; pages: number; total: number; limit: number };

/** Footer link columns built from the collections placed in them. */
export async function getFooterColumns(): Promise<FooterColumn[]> {
  return apiFetch<FooterColumn[]>("/collections/footer");
}

/** Slugs of published collections, for generateStaticParams. */
export async function getCollectionSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/collections/slugs");
}

/** What the colleges listing needs to dress itself as a collection: its header, SEO and filters. */
export type CollectionMeta = {
  slug: string;
  title: string;
  heading: string;
  subheading: string;
  author: { name: string; role: string; photo: string };
  membership: "filters" | "picked";
  filters: CollectionFilters;
  rankingListSlug: string;
  href: string;
  seo: Partial<CollectionSeo>;
};

/** A published collection's header, SEO and filters. A slug that is unknown or unpublished is a 404. */
export async function getCollectionMeta(slug: string): Promise<CollectionMeta> {
  return apiFetch<CollectionMeta>(`/collections/${encodeURIComponent(slug)}/meta`);
}

/** Every published collection and the address it opens, for choosing collections to add to the menu. */
export async function getCollectionLinks(): Promise<{ slug: string; title: string; href: string }[]> {
  return apiFetch("/collections/links");
}

/** A published collection's page: its colleges, related collections, and canonical URL. */
export async function getCollectionPage(slug: string): Promise<CollectionPagePayload> {
  return apiFetch<CollectionPagePayload>(`/collections/${slug}/page`);
}

// ── Admin catalogue (courses and specialisations) ───────────────────────────

/** How a category, course or specialisation is taught. */
export type Delivery = "offline" | "online" | "both";

export type AdminSpecialisation = {
  id: string;
  slug: string;
  name: string;
  /** A link made before the list was flat; null for any added since. The editor does not ask for one. */
  courseSlug: string | null;
  courseName: string | null;
  /** Every course it sits under, by slug. */
  courseSlugs: string[];
  stream: string | null;
  delivery: Delivery;
  duration: string | null;
  averageFees: string | null;
  collegeCount: number;
  /** What the site shows: the typed figure, or the live count when none is typed. */
  shownCount: number;
  about: string | null;
};

export type AdminCourse = {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  level: "UG" | "PG" | "Diploma" | "Doctorate" | "";
  stream: string;
  /** Every category it sits under. */
  streams: string[];
  delivery: Delivery;
  duration: string;
  modes: string[];
  eligibility: string | null;
  averageFees: string | null;
  examsAccepted: string[];
  collegeCount: number;
  /** What the site shows: the typed figure, or the live count when none is typed. */
  shownCount: number;
  about: string | null;
  /** 1 is shown first in the Courses list and menu. Null: after those that have one. */
  priority?: number | null;
  isPublished: boolean;
};

/** The two catalogue lists, each on its own. The categories come from the fields list. */
export async function adminGetCatalogue(token: string): Promise<{ courses: AdminCourse[]; specialisations: AdminSpecialisation[] }> {
  return adminRequest<{ courses: AdminCourse[]; specialisations: AdminSpecialisation[] }>(token, "GET", "/admin/catalogue");
}

export async function adminCreateCourse(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/courses", body);
}

export async function adminDeleteCourses(token: string, slugs: string[]) {
  return adminRequest<{ message: string; deleted: number }>(token, "POST", "/admin/courses/delete", { slugs });
}

export async function adminUpdateCourse(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/courses/${slug}`, body);
}

export async function adminCreateSpecialisation(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/specialisations", body);
}

export async function adminUpdateSpecialisation(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/specialisations/${slug}`, body);
}

/** A programme a college also offers online, as the Online Programmes screen lists it. */
export type OnlineOffering = { id: string; course: string; specialisation: string; college: string; collegeSlug: string; duration: string; fees: string; enabled: boolean };

export async function adminListOnlineOfferings(token: string): Promise<OnlineOffering[]> {
  return adminRequest<OnlineOffering[]>(token, "GET", "/admin/online-offerings");
}

export async function adminSetOnlineOfferingEnabled(token: string, id: string, enabled: boolean) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/online-offerings/${id}/enabled`, { enabled });
}

/** Sets offline, online or both on courses and specialisations, by slug. */
export async function adminPutDelivery(token: string, body: { courses?: Record<string, Delivery>; specialisations?: Record<string, Delivery> }) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/catalogue/delivery", body);
}

export async function adminDeleteSpecialisations(token: string, slugs: string[]) {
  return adminRequest<{ message: string; deleted: number }>(token, "POST", "/admin/specialisations/delete", { slugs });
}

// ── Admin rankings ─────────────────────────────────────────────────────────

export type AdminRankingEntry = { collegeSlug: string; rank: number; score: string | null };

export type AdminRanking = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  authority: string;
  year: number;
  stream: string | null;
  entries: AdminRankingEntry[];
};

export async function adminGetRankings(token: string): Promise<AdminRanking[]> {
  return adminRequest<AdminRanking[]>(token, "GET", "/admin/rankings");
}

export async function adminCreateRanking(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/rankings", body);
}

export async function adminUpdateRanking(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/rankings/${slug}`, body);
}

export async function adminDeleteRanking(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/rankings/${slug}`);
}

// ── Admin collections ─────────────────────────────────────────────────────

export type CollectionOption = { slug: string; name: string };

export type AdminCollectionOptions = {
  streams: string[];
  courses: string[];
  specialisations: string[];
  /** The categories each course sits under, by course name. */
  courseStreams: Record<string, string[]>;
  /** The courses each specialisation sits under, by specialisation name. */
  specialisationCourses: Record<string, string[]>;
  cities: string[];
  exams: string[];
  approvals: string[];
  modes: string[];
  ownerships: string[];
  levels: string[];
  credentials: string[];
  rankings: CollectionOption[];
  colleges: { slug: string; name: string; city: string; stream: string }[];
  /** The header-menu categories a collection can be added to. */
  menuGroups: { id: string; label: string }[];
};

/** How many published colleges a membership holds right now, and the first few. */
export type CollectionPreview = { count: number; sample: { slug: string; name: string; city: string }[] };

export async function adminPreviewCollection(token: string, body: Record<string, unknown>): Promise<CollectionPreview> {
  return adminRequest<CollectionPreview>(token, "POST", "/admin/collections/preview", body);
}

export async function adminGetCollectionOptions(token: string): Promise<AdminCollectionOptions> {
  return adminRequest<AdminCollectionOptions>(token, "GET", "/admin/collections/options");
}

export async function adminGetCollections(token: string): Promise<Collection[]> {
  return adminRequest<Collection[]>(token, "GET", "/admin/collections");
}

export async function adminCreateCollection(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/collections", body);
}

export async function adminUpdateCollection(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/collections/${slug}`, body);
}

// ── Admin homepage bands ──────────────────────────────────────────────────

export type AdminHomepageBand = {
  slug: string;
  title: string;
  heading: string;
  /** The line under the heading. Absent from an API older than the editable text. */
  subheading?: string;
  isPublished: boolean;
  isVisible: boolean;
  limit: number;
  order: number;
  total: number;
  /** Every college of the section with its category; the card limit applies to each category. */
  preview: { slug: string; name: string; stream: string }[];
};

export type AdminHomepageAvailable = { slug: string; title: string; isPublished: boolean };

export type AdminHomepage = { bands: AdminHomepageBand[]; available: AdminHomepageAvailable[] };

export async function adminGetHomepage(token: string): Promise<AdminHomepage> {
  return adminRequest<AdminHomepage>(token, "GET", "/admin/homepage");
}

export async function adminSaveHomepage(token: string, bands: { slug: string; limit: number; isVisible: boolean }[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/homepage", { bands });
}

/** What the Add a college row form sends. */
export type NewBandInput = { title: string; heading: string; subheading: string; collegeSlugs: string[]; limit: number };

export async function adminCreateBand(token: string, body: NewBandInput) {
  return adminRequest<{ slug: string; message: string }>(token, "POST", "/admin/homepage/bands", body);
}

export async function adminUpdateBandWords(token: string, slug: string, body: { heading: string; subheading: string }) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/homepage/bands/${encodeURIComponent(slug)}`, body);
}

/** A college as the band editor lists it: just what a card and the picker need. */
export type BandCollege = {
  slug: string;
  name: string;
  city: string;
  state: string;
  ownership: "Private" | "Government" | "Deemed";
  stream: string;
  feesRange: string;
  image: string;
};

export type BandColleges = {
  /** The band's colleges in the editor's order. */
  colleges: BandCollege[];
  /** Every other college, for "add existing". */
  options: BandCollege[];
  /** True when a ranking list decides the order shown on the site. */
  rankingBound: boolean;
};

export async function adminGetBandColleges(token: string, slug: string): Promise<BandColleges> {
  return adminRequest<BandColleges>(token, "GET", `/admin/collections/${encodeURIComponent(slug)}/colleges`);
}

export async function adminPutBandColleges(token: string, slug: string, slugs: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/collections/${encodeURIComponent(slug)}/colleges`, { slugs });
}

/** What the college form sends. The slug is made from the name when a college is created. */
export type CollegeCardInput = {
  name: string;
  city: string;
  state: string;
  ownership: "Private" | "Government" | "Deemed";
  stream: string;
  feesRange: string;
  image: string;
};

// ── Admin homepage content ────────────────────────────────────────────────

/** A stored homepage block (careers panels or data tiles), as the admin editor sees it. */
export async function adminGetContent(token: string, name: "careers" | "highlights"): Promise<{ items: unknown[] }> {
  return adminRequest<{ items: unknown[] }>(token, "GET", `/admin/content/${name}`);
}

export async function adminPutContent(token: string, name: "careers" | "highlights", items: unknown[]) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/content/${name}`, { items });
}

/** An exam as the Top Exams editor lists it. `show` is whether it is in the homepage row. */
export type AdminExam = {
  slug: string;
  name: string;
  shortName?: string;
  conductingBody: string;
  level: "National" | "State";
  mode: string;
  description: string;
  registrationCloses: string;
  examDate: string;
  applicationFee: string;
  frequency: string;
  officialSite: string;
  durationMinutes: number | null;
  sections: string[];
  stream: string;
  eligibility: string;
  syllabus: string;
  faqs: ExamFaq[];
  image: string;
  statusLabel?: string;
  show: boolean;
};

/** Every exam, the homepage ones first in their order. `slugs` is the homepage row. */
export type AdminTopExams = {
  slugs: string[];
  exams: AdminExam[];
};

/** What the exam form sends. The slug is made from the name when an exam is created. */
export type ExamInput = {
  name: string;
  shortName: string;
  conductingBody: string;
  level: "National" | "State";
  mode: string;
  description: string;
  registrationCloses: string;
  examDate: string;
  applicationFee: string;
  frequency: string;
  officialSite: string;
  durationMinutes: number | null;
  sections: string[];
  stream: string;
  eligibility: string;
  syllabus: string;
  faqs: ExamFaq[];
  image: string;
  /** The badge on the exam's card. Empty: none. */
  statusLabel: string;
};

export async function adminGetTopExams(token: string): Promise<AdminTopExams> {
  return adminRequest<AdminTopExams>(token, "GET", "/admin/homepage/top-exams");
}

export async function adminPutTopExams(token: string, slugs: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/homepage/top-exams", { slugs });
}

// ── Admin homepage copy ───────────────────────────────────────────────────

export async function adminGetHomeCopy(token: string): Promise<HomeCopy> {
  return adminRequest<HomeCopy>(token, "GET", "/admin/home-copy");
}

export async function adminPutHomeCopy(token: string, part: keyof HomeCopy, value: Record<string, string>) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/home-copy/${part}`, value);
}

/** One location in the admin's carousel editor. `show` is the checkbox. */
export type FeaturedInput = { stream: string; colleges: string[] };
export type AdminHomeLocation = Omit<HomeLocation, "featured" | "highlightCollege"> & { highlightCollege?: string; show: boolean; district: string; featured: FeaturedInput[] };

export async function adminGetHomeLocations(token: string): Promise<AdminHomeLocation[]> {
  const data = await adminRequest<{ locations: AdminHomeLocation[] }>(token, "GET", "/admin/homepage/locations");
  return data.locations;
}

/** Admin: save which locations show and their order (the array order). Card content is saved per location. */
export async function adminPutHomeLocations(token: string, locations: { slug: string; show: boolean }[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/homepage/locations", { locations });
}

/** What the Manage locations form sends. The slug is made from the name on create and never changes. */
export type LocationInput = {
  name: string;
  state: string;
  district: string;
  collegeCount: number;
  description: string;
  avgPackage: string;
  image: string;
  /** The pool labels this card shows, by text. A text not yet in the pool is added to it. */
  labels: string[];
  courseFees: CourseFee[];
  /** Categories the card offers and the colleges under each. */
  featured: FeaturedInput[];
  /** The college the card highlights, by slug. Empty: none. */
  highlightCollege: string;
  /** Older cards: a typed college name shown as a caption. */
  imageCaption: string;
  /** Figures over the photo. Empty: worked out from the location's colleges. */
  nirfRank: number | null;
  otherRankLabel: string;
  otherRank: number | null;
  topRating: number | null;
  /** On the homepage carousel. */
  show: boolean;
};

/** A reusable card tag and the locations that show it. `id` is null until the label is first saved. */
export type AdminLocationLabel = { id: string | null; text: string; slugs: string[] };

/** Every category and its colleges, for the card editor's pickers. */
export type LocationPicker = { streams: string[]; colleges: { slug: string; name: string; stream: string; city: string; image?: string; institutionType?: string }[] };

export async function adminGetLocationPicker(token: string): Promise<LocationPicker> {
  return adminRequest<LocationPicker>(token, "GET", "/admin/locations/picker");
}

export async function adminGetLocationLabels(token: string): Promise<AdminLocationLabel[]> {
  const data = await adminRequest<{ labels: AdminLocationLabel[] }>(token, "GET", "/admin/locations/labels");
  return data.labels;
}

/** A hero slide in the admin table. */
export type AdminHeroItem = HeroItem & { active: boolean };

/** What the slide form sends. */
export type HeroItemInput = {
  headline: string;
  subheadline: string;
  image: string;
  imageAlt: string;
  active: boolean;
};

export async function adminGetHeroItems(token: string): Promise<{ items: AdminHeroItem[]; max: number }> {
  return adminRequest<{ items: AdminHeroItem[]; max: number }>(token, "GET", "/admin/hero-items");
}

export async function adminCreateHeroItem(token: string, body: HeroItemInput) {
  return adminRequest<AdminHeroItem>(token, "POST", "/admin/hero-items", body);
}

export async function adminUpdateHeroItem(token: string, id: string, body: HeroItemInput) {
  return adminRequest<AdminHeroItem>(token, "PATCH", `/admin/hero-items/${encodeURIComponent(id)}`, body);
}

export async function adminDeleteHeroItem(token: string, id: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/hero-items/${encodeURIComponent(id)}`);
}

export async function adminPutHeroOrder(token: string, ids: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/hero-items/order", { ids });
}

/** A field in the admin list. `collegeCount` is how many colleges its page would list; 0 means the link shows "not found". */
export type AdminField = HomeField & { show: boolean; collegeCount: number; delivery: Delivery };

/** What the field form sends. The slug is made from the name on create and never changes. */
export type FieldInput = {
  name: string;
  icon: string;
  tagline: string;
  badge: string;
  avgCtc: string;
  show: boolean;
  delivery?: Delivery;
};

export async function adminGetFields(token: string): Promise<AdminField[]> {
  const data = await adminRequest<{ fields: AdminField[] }>(token, "GET", "/admin/fields");
  return data.fields;
}

export async function adminPutFieldOrder(token: string, fields: { slug: string; show: boolean }[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/fields/order", { fields });
}

export async function adminCreateField(token: string, body: FieldInput) {
  return adminRequest<AdminField>(token, "POST", "/admin/fields", body);
}

export async function adminUpdateField(token: string, slug: string, body: FieldInput) {
  return adminRequest<AdminField>(token, "PATCH", `/admin/fields/${encodeURIComponent(slug)}`, body);
}

export async function adminDeleteField(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/fields/${encodeURIComponent(slug)}`);
}

/** Every state or union territory with its districts, for the location form's dropdowns. */
export type IndiaGeo = Record<string, string[]>;

/** The same state and district lists, for the public site (the profile form). */
export async function getIndiaGeo(): Promise<IndiaGeo> {
  return (await apiFetch<{ states: IndiaGeo }>("/geo/india")).states;
}

export async function adminGetGeo(token: string): Promise<IndiaGeo> {
  const data = await adminRequest<{ states: IndiaGeo }>(token, "GET", "/admin/locations/geo");
  return data.states;
}

export async function adminCreateLocation(token: string, body: LocationInput) {
  return adminRequest<AdminHomeLocation>(token, "POST", "/admin/locations", body);
}

export async function adminUpdateLocation(token: string, slug: string, body: LocationInput) {
  return adminRequest<AdminHomeLocation>(token, "PATCH", `/admin/locations/${encodeURIComponent(slug)}`, body);
}

export async function adminDeleteLocation(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/locations/${encodeURIComponent(slug)}`);
}

/**
 * Admin: upload one image for a homepage slot. The API checks the file's real
 * type, size and pixel dimensions and returns the relative path to store.
 */
export async function adminUploadImage(token: string, kind: "hero" | "banner" | "location" | "college" | "exam" | "practice" | "program" | "article" | "article_figure" | "logo" | "site_logo" | "recruiter_logo" | "gallery", file: File) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  const url = `${API_BASE}/admin/uploads`;
  // No Content-Type: fetch sets the multipart boundary itself.
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: { url: string; width: number; height: number } }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `Upload failed (${res.status}).`);
  }
  return json.data;
}

// ── Admin programmes ──────────────────────────────────────────────────────

export type AdminProgram = {
  id: string;
  slug: string;
  name: string;
  universityName: string;
  universitySlug: string;
  onlineDuration: string | null;
  onlineFees: string | null;
  onlineFeesNote: string | null;
  onCampusDuration: string | null;
  onCampusFees: string | null;
  /** Off: kept in the admin, hidden from the site. */
  isActive: boolean;
  /** The programme's own photo: /images/... or /api/uploads/... Empty: the shared set. */
  image: string;
};

/** What the programme form sends. The slug is made from the name when a programme is created. */
export type ProgramInput = {
  name: string;
  universityName: string;
  universitySlug: string;
  onlineDuration: string;
  onlineFees: string;
  onlineFeesNote: string;
  onCampusDuration: string;
  onCampusFees: string;
  isActive: boolean;
  image: string;
};

/** A course a college offers, which a programme can be made from. */
export type ProgramSourceCourse = {
  id: string;
  name: string;
  specialisation?: string;
  mode: string;
  duration: string;
  fees: string;
  collegeSlug: string;
  collegeName: string;
  collegeImage: string;
};

export async function adminListPrograms(token: string): Promise<{ programs: AdminProgram[]; recommended: string[]; courses: ProgramSourceCourse[] }> {
  const data = await adminRequest<{ programs: AdminProgram[]; recommended: string[]; courses?: ProgramSourceCourse[] }>(token, "GET", "/admin/programs");
  return { ...data, courses: data.courses ?? [] };
}

export async function adminCreateProgram(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/programs", body);
}

export async function adminUpdateProgram(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/programs/${slug}`, body);
}

export async function adminSetRecommendedPrograms(token: string, slugs: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/programs/recommended", { slugs });
}

// ── Admin recommended colleges (homepage) ─────────────────────────────────

export type AdminUniversities = {
  slugs: string[];
  colleges: { slug: string; name: string }[];
  options: { slug: string; name: string }[];
};

export async function adminGetUniversities(token: string): Promise<AdminUniversities> {
  return adminRequest<AdminUniversities>(token, "GET", "/admin/homepage/universities");
}

export async function adminSetUniversities(token: string, slugs: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/homepage/universities", { slugs });
}

export async function adminDeleteCollection(token: string, slug: string, confirm?: string) {
  const query = confirm ? `?confirm=${encodeURIComponent(confirm)}` : "";
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/collections/${slug}${query}`);
}

export async function adminDeletePrograms(token: string, slugs: string[]) {
  return adminRequest<{ message: string; deleted: number }>(token, "POST", "/admin/programs/delete", { slugs });
}

export async function adminDeleteProgram(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/programs/${slug}`);
}

// ── Practice tests ───────────────────────────────────────────────────────

/** The practice test cards for an exam, free sample sets first. */
export async function getPracticeTests(exam?: string): Promise<TestSummary[]> {
  const query = exam ? `?exam=${encodeURIComponent(exam)}` : "";
  return apiFetch<TestSummary[]>(`/practice/tests${query}`);
}

/** One published test with its questions and stimuli, as a candidate sees it. Null when unknown. */
export async function getPracticeTest(slug: string): Promise<MockTest | null> {
  try {
    return await apiFetch<MockTest>(`/practice/tests/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Scores a sitting on the server. The server returns the score and each
 * question's correct answer and solution; nothing about the answers is known
 * before this call.
 */
export async function submitPractice(
  slug: string,
  responses: Record<string, { status: string; saved?: unknown; secondsSpent: number }>
): Promise<AttemptResult> {
  const url = `${API_BASE}/practice/tests/${encodeURIComponent(slug)}/submit`;
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: AttemptResult }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `Practice submit failed (${res.status})`);
  }
  return json.data;
}

// ── Sitemap ───────────────────────────────────────────────────────────────

/** Slugs for one kind of page, from the backend's sitemap endpoints. */
export async function getSitemapSlugs(
  kind: "colleges" | "exams" | "articles" | "courses"
): Promise<string[]> {
  return apiFetch<string[]>(`/sitemap/${kind}`);
}

// ── Admin API helpers (used from Server Components in /admin) ─────────────

/**
 * One admin write. The API's error message is passed through; a body that is
 * not JSON, or a failure with no message, falls back to the status alone.
 */
async function adminRequest<T>(
  token: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const json = (await res.json().catch(() => null)) as
      | { success: true; data: T }
      | { success: false; error?: { message?: string } }
      | null;
    if (!res.ok || !json || json.success !== true) {
      const message = json && json.success === false ? json.error?.message : undefined;
      throw new ApiError(res.status, message ?? `Admin API ${res.status}`);
    }
    return json.data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(408, "Request timed out after 10 seconds. Please try again.");
    }
    throw err;
  }
}

/** Admin: create a college. The slug must be new. */
export async function adminCreateCollege(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/colleges", body);
}

/** Admin: publish a draft, archive a college, or restore an archived one. */
export async function adminSetCollegeStatus(token: string, slug: string, status: CollegeStatus) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/colleges/${encodeURIComponent(slug)}/status`, { status });
}

/** Admin: delete for good. The API refuses unless the college is archived. */
export async function adminDeleteCollege(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/colleges/${encodeURIComponent(slug)}`);
}

/** Admin: partial update of a college. Only the keys present are changed. */
export async function adminUpdateCollege(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/colleges/${slug}`, body);
}

/** Admin: create an exam. The slug must be new. */
export async function adminCreateExam(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/exams", body);
}

/** Admin: partial update of an exam. Only the keys present are changed. */
export async function adminUpdateExam(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/exams/${slug}`, body);
}

export type StudyAbroadKind = "destination" | "step" | "test" | "faq";

/** Admin view of the study-abroad content: every row carries its id. */
export type StudyAbroadAdminContent = {
  figuresReviewed: string | null;
  destinations: (StudyAbroadDestination & { id: string })[];
  applicationSteps: (StudyAbroadStep & { id: string })[];
  admissionTests: (StudyAbroadTest & { id: string })[];
  faqs: (StudyAbroadFaq & { id: string })[];
};

export async function adminGetStudyAbroad(token: string): Promise<StudyAbroadAdminContent> {
  return adminRequest<StudyAbroadAdminContent>(token, "GET", "/admin/study-abroad");
}

export async function adminCreateStudyAbroadItem(token: string, kind: StudyAbroadKind, body: Record<string, unknown>) {
  return adminRequest<{ id: string }>(token, "POST", `/admin/study-abroad/${kind}`, body);
}

export async function adminUpdateStudyAbroadItem(
  token: string,
  kind: StudyAbroadKind,
  id: string,
  body: Record<string, unknown>
) {
  return adminRequest<{ id: string }>(token, "PUT", `/admin/study-abroad/${kind}/${id}`, body);
}

export async function adminReorderStudyAbroad(token: string, kind: StudyAbroadKind, ids: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/study-abroad/${kind}/order`, { ids });
}

export async function adminDeleteStudyAbroadItem(token: string, kind: StudyAbroadKind, id: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/study-abroad/${kind}/${id}`);
}

export async function adminSetFiguresReviewed(token: string, value: string) {
  return adminRequest<{ figuresReviewed: string }>(token, "PUT", "/admin/study-abroad/figures-reviewed", { value });
}

/** Admin: list all colleges (requires Authorization header). */
export async function adminGetColleges(
  token: string,
  params?: { page?: number; limit?: number; q?: string }
): Promise<{ data: College[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page",  String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.q)     qs.set("q",     params.q);
  const query = qs.toString() ? `?${qs}` : "";
  const url = `${API_BASE}/admin/colleges${query}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status, `Admin API ${res.status}`);
  const json = (await res.json()) as { success: true; data: College[]; meta: PaginationMeta };
  return { data: json.data, meta: json.meta };
}

export const LEAD_STATUSES = ["new", "contacted", "converted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type AdminLead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  collegeSlug: string | null;
  type: string;
  status: LeadStatus;
  createdAt: string | null;
  userId: string | null;
  visitorId: string | null;
  stream: string | null;
  city: string | null;
  message: string | null;
  programName: string | null;
  source: string | null;
  sourceUrl: string | null;
  consent: boolean;
  repeatCount: number;
  replies: { id: string; authorName: string; body: string; createdAt: string | null }[];
};

export type AdminDashboard = {
  totals: { leads: number; newLeads: number; colleges: number; exams: number; articles: number };
  leadsByDay: { date: string; count: number }[];
  leadSources: { label: string; count: number }[];
  recentLeads: {
    id: string;
    name: string;
    type: string;
    status: LeadStatus;
    collegeSlug: string | null;
    createdAt: string | null;
  }[];
};

/** Admin: one page of leads, newest first, with pagination metadata. */
export async function adminListLeads(
  token: string,
  params: { page?: number; limit?: number; status?: LeadStatus } = {}
): Promise<{ data: AdminLead[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.status) qs.set("status", params.status);
  const query = qs.toString() ? `?${qs}` : "";
  const url = `${API_BASE}/admin/leads${query}`;
  const res = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: AdminLead[]; meta: PaginationMeta }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `Admin leads API ${res.status}`);
  }
  return { data: json.data, meta: json.meta };
}

/** Admin: set a lead's status. */
export async function adminUpdateLeadStatus(token: string, id: string, status: LeadStatus) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/leads/${id}`, { status });
}

/** Admin: send a reply the lead's owner sees under My account. */
export async function adminReplyToLead(token: string, id: string, body: string) {
  return adminRequest<{ message: string }>(token, "POST", `/admin/leads/${id}/replies`, { body });
}

export type AdminAnalytics = {
  days: number;
  totals: { visitors: number; sessions: number; pageViews: number; leads: number; signups: number };
  byDay: { date: string; visitors: number; pageViews: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  topCtas: { cta: string; label: string | null; clicks: number; visitors: number }[];
  topColleges: { slug: string; views: number; visitors: number }[];
  sources: { source: string; visitors: number; sessions: number }[];
  devices: { device: string; visitors: number }[];
  funnel: { step: string; count: number }[];
};

export type TrackedEvent = {
  id: number;
  name: string;
  path: string | null;
  properties: Record<string, unknown>;
  at: string | null;
};

export type LeadJourney = {
  visitor: {
    firstSeenAt: string | null;
    firstReferrer: string | null;
    firstLandingPath: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
    device: string | null;
    browser: string | null;
    os: string | null;
  } | null;
  events: TrackedEvent[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  authProvider: string;
  isActive: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  leadCount: number;
  /** Whether the admin who asked may enable or disable this account. The API enforces it too. */
  canManage: boolean;
  /** Set for college admins. */
  collegeSlug: string | null;
  collegeName: string | null;
};

export type UserGroup = "general" | "administrative" | "college";

export type AdminUserDetail = AdminUser & {
  preferredStream: string | null;
  targetExam: string | null;
  marketingConsent: boolean;
  sessions: number;
  leads: { id: string; type: string; status: LeadStatus; collegeSlug: string | null; programName: string | null; createdAt: string | null }[];
  events: TrackedEvent[];
};

// ── College admin: the account, as a platform admin manages it ───────────

export type CollegeAdminAccount = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
};

export const adminGetCollegeAdmin = (token: string, slug: string) =>
  adminRequest<{ admin: CollegeAdminAccount | null }>(token, "GET", `/admin/colleges/${encodeURIComponent(slug)}/admin`);

export const adminCreateCollegeAdmin = (token: string, slug: string, body: { name: string; email: string; password: string }) =>
  adminRequest<{ admin: CollegeAdminAccount }>(token, "POST", `/admin/colleges/${encodeURIComponent(slug)}/admin`, body);

export const adminResetCollegeAdminPassword = (token: string, slug: string, password: string) =>
  adminRequest<{ admin: CollegeAdminAccount }>(token, "POST", `/admin/colleges/${encodeURIComponent(slug)}/admin/reset-password`, { password });

export const adminSetCollegeAdminActive = (token: string, slug: string, isActive: boolean) =>
  adminRequest<{ admin: CollegeAdminAccount }>(token, "PATCH", `/admin/colleges/${encodeURIComponent(slug)}/admin`, { isActive });

export const adminRemoveCollegeAdmin = (token: string, slug: string) =>
  adminRequest<{ admin: null }>(token, "DELETE", `/admin/colleges/${encodeURIComponent(slug)}/admin`);

// ── College portal: what a college admin sees, all about their one college ─

export type CollegeDashboard = {
  college: { slug: string; name: string };
  totals: { leads: number; newLeads: number; pageViews: number; visitors: number; ctaClicks: number };
  byDay: { date: string; leads: number; views: number; visitors: number }[];
  days: number;
};

export const collegeGetDashboard = (token: string) => adminRequest<CollegeDashboard>(token, "GET", "/college/dashboard");
export const collegeGetRecord = (token: string) => adminRequest<LoadedCollegeRecord>(token, "GET", "/college/record");
export const collegeGetPools = (token: string) => adminRequest<CollegePools>(token, "GET", "/college/pools");
export const collegeUpdateLeadStatus = (token: string, id: string, status: LeadStatus) =>
  adminRequest<{ message: string }>(token, "PATCH", `/college/leads/${id}`, { status });
export const collegeReplyToLead = (token: string, id: string, body: string) =>
  adminRequest<{ message: string }>(token, "POST", `/college/leads/${id}/replies`, { body });

/** One page of the college's own leads. Same shape as the platform inbox. */
export async function collegeListLeads(
  token: string,
  params: { page?: number; limit?: number; status?: LeadStatus } = {}
): Promise<{ data: AdminLead[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.status) qs.set("status", params.status);
  const query = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${API_BASE}/college/leads${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: AdminLead[]; meta: PaginationMeta }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `College leads API ${res.status}`);
  }
  return { data: json.data, meta: json.meta };
}

/** Adds a password to an account that has none (a Google sign-up), so it can also sign in with email and password. */
export async function setMyPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/me/password/set`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newPassword }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Could not set the password");
}

/** Replaces the password. A college admin on a temporary one does this first. */
export async function changeMyPassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/me/password`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Could not change the password");
}

export const adminUserCounts = (token: string) =>
  adminRequest<Record<UserGroup, number>>(token, "GET", "/admin/users/counts");

export const adminCreateAdministrator = (
  token: string,
  body: { name: string; email: string; password: string; role: "ADMIN" | "SUPER_ADMIN" }
) => adminRequest<AdminUser>(token, "POST", "/admin/users", body);

export const adminGetAnalytics = (token: string, days = 14) =>
  adminRequest<AdminAnalytics>(token, "GET", `/admin/analytics?days=${days}`);

export const adminLeadJourney = (token: string, leadId: string) =>
  adminRequest<LeadJourney>(token, "GET", `/admin/leads/${leadId}/journey`);

export const adminGetUser = (token: string, id: string) =>
  adminRequest<AdminUserDetail>(token, "GET", `/admin/users/${id}`);

export const adminResetUserPassword = (token: string, id: string, password: string) =>
  adminRequest<AdminUser>(token, "POST", `/admin/users/${id}/reset-password`, { password });

export const adminSetUserActive = (token: string, id: string, isActive: boolean) =>
  adminRequest<AdminUser>(token, "PATCH", `/admin/users/${id}`, { isActive });

/** Admin: one page of student accounts, newest first. */
export async function adminListUsers(
  token: string,
  params: { group?: UserGroup; page?: number; limit?: number; q?: string } = {}
): Promise<{ data: AdminUser[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.group) qs.set("group", params.group);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${API_BASE}/admin/users${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: AdminUser[]; meta: PaginationMeta }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `Admin users API ${res.status}`);
  }
  return { data: json.data, meta: json.meta };
}

/** Admin: the figures for the dashboard, computed by the API from the database. */
export async function adminGetDashboard(token: string): Promise<AdminDashboard> {
  return adminRequest<AdminDashboard>(token, "GET", "/admin/dashboard");
}

// ── Admin practice tests ──────────────────────────────────────────────────

/** A test as the exam's Practice tests tab lists it. */
export type AdminPracticeCard = {
  slug: string;
  examSlug: string;
  title: string;
  kind: "full-mock" | "sectional" | "previous-year" | "sample";
  summary: string;
  totalMinutes: number;
  isFree: boolean;
  isPublished: boolean;
  questionCount: number;
  sectionCount: number;
};

/** One question as the editor holds it: plain text throughout. */
export type AdminPracticeQuestion = {
  type: "mcq-single" | "mcq-multi" | "tita";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  stem: string;
  /** A passage shared with the questions that carry the same text. */
  passage: string;
  options: string[];
  /** Positions in `options` of the correct answer(s). */
  correctOptions: number[];
  /** The correct number of a type-in question. */
  answerValue: number | null;
  tolerance: number;
  marks: number;
  negativeMarks: number;
  expectedSeconds: number;
  solution: string;
};

export type AdminPracticeSection = {
  label: string;
  /** Minutes the candidate is held in the section when sections are locked. */
  durationMinutes: number | null;
  questions: AdminPracticeQuestion[];
};

/** A whole test as the editor holds it, and as it is saved. */
export type AdminPracticeTest = {
  title: string;
  kind: AdminPracticeCard["kind"];
  summary: string;
  /** 0 means untimed. */
  totalMinutes: number;
  sectionLock: boolean;
  languages: string[];
  /** null: unlimited retakes. */
  attemptsAllowed: number | null;
  isFree: boolean;
  isPublished: boolean;
  sections: AdminPracticeSection[];
};

export async function adminListPracticeTests(token: string, exam: string): Promise<AdminPracticeCard[]> {
  const data = await adminRequest<{ tests: AdminPracticeCard[] }>(token, "GET", `/admin/practice/tests?exam=${encodeURIComponent(exam)}`);
  return data.tests;
}

export async function adminGetPracticeTest(token: string, slug: string): Promise<AdminPracticeTest & { slug: string; examSlug: string }> {
  return adminRequest(token, "GET", `/admin/practice/tests/${encodeURIComponent(slug)}`);
}

export async function adminCreatePracticeTest(token: string, body: { examSlug: string; title: string }) {
  return adminRequest<{ slug: string; message: string }>(token, "POST", "/admin/practice/tests", body);
}

export async function adminSavePracticeTest(token: string, slug: string, body: AdminPracticeTest) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/practice/tests/${encodeURIComponent(slug)}`, body);
}

export async function adminDeletePracticeTest(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/practice/tests/${encodeURIComponent(slug)}`);
}

// ── Admin: link pool and homepage news ────────────────────────────────────

/** Every page a homepage link can point to, grouped, from the data already in the directory. */
export type LinkPool = { groups: { label: string; items: { label: string; path: string }[] }[] };

export async function adminGetLinkPool(token: string): Promise<LinkPool> {
  return adminRequest<LinkPool>(token, "GET", "/admin/content/link-pool");
}

/** An article as the news manager edits it. */
export type AdminArticle = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  /** The page as sections of blocks. */
  sections: import("@/lib/article-sections").ArticleSection[];
  author: string;
  category: string;
  readMinutes: number;
  /** YYYY-MM-DD */
  publishedAt: string;
  isPublished: boolean;
  relatedCollegeSlugs: string[];
  /** /images/... or /api/uploads/... Empty: no picture. */
  image: string;
};

/** What the article form sends. The slug is made from the title when an article is created. */
export type ArticleInput = Omit<AdminArticle, "slug">;

export type AdminNews = { pinned: string[]; articles: AdminArticle[] };

export async function adminGetNews(token: string): Promise<AdminNews> {
  return adminRequest<AdminNews>(token, "GET", "/admin/homepage/articles");
}

export async function adminSetPinnedNews(token: string, slugs: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/homepage/articles", { slugs });
}

export async function adminCreateArticle(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/articles", body);
}

export async function adminUpdateArticle(token: string, slug: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "PATCH", `/admin/articles/${encodeURIComponent(slug)}`, body);
}

export async function adminDeleteArticle(token: string, slug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/articles/${encodeURIComponent(slug)}`);
}

// ── Admin: the whole college record ───────────────────────────────────────

export type RecordCourse = { name: string; specialisation: string; duration: string; mode: string; fees: string; exams: string[]; eligibility: string; seats: number | null; onlineOffered: boolean; onlineEnabled?: boolean; onlineDuration: string; onlineFees: string };
export type RecordPlacement = { yearStart: number | null; year: number; average: string; median: string; highest: string; placedPercent: number | null; topRecruiters: string[]; breakdown: PlacementBreakdown[] };
export type RecordCutoff = { exam: string; category: string; course: string; specialisation: string; score: string };
export type RecordReview = {
  id?: string;
  author: string;
  course: string;
  batch: string;
  verified: boolean;
  /** YYYY-MM-DD */
  date: string;
  rating: number;
  body: string;
  ratingPlacements: number | null;
  ratingFaculty: number | null;
  ratingInfrastructure: number | null;
  ratingCampusLife: number | null;
  approved: boolean;
};
export type RecordDetail = {
  shortName: string;
  tagline: string;
  locality: string;
  logo: string;
  brochureUrl: string;
  faculty: CollegeFaculty;
  faqs: CollegeFaq[];
  similarSlugs: string[];
  seo: { metaTitle: string; metaDescription: string };
  gallery: CollegeGalleryItem[];
  videos: CollegeVideoItem[];
  media: CollegeMediaItem[];
  alerts: CollegeAlert[];
  articles: CollegeArticle[];
  tabs: Record<string, import("@/lib/rich-text").RichTextDoc>;
  tabHeaders: Record<string, TabHeaderConfig>;
};

/** A college as the editor holds it: everything its page shows. Saved together. */
export type CollegeRecord = {
  name: string;
  city: string;
  state: string;
  ownership: "Private" | "Government" | "Deemed";
  stream: string;
  /** Every category it is listed under; `stream` is the first. */
  streams: string[];
  /** Whether this listing is a college or a university. */
  institutionType: "College" | "University";
  feesRange: string;
  about: string;
  established: number | null;
  rankingAuthority: string;
  rankingRank: number | null;
  examsAccepted: string[];
  tags: string[];
  approvals: string[];
  image: string;
  courses: RecordCourse[];
  placements: RecordPlacement[];
  cutoffs: RecordCutoff[];
  reviews: RecordReview[];
  detail: RecordDetail;
};
export type LoadedCollegeRecord = CollegeRecord & { slug: string; updatedAt: string };

/** What the editor's pickers offer, from the directory. */
export type CollegePools = {
  streams: string[];
  exams: string[];
  courses: string[];
  specialisations: string[];
  /** The categories each course sits under, by course name. */
  courseStreams: Record<string, string[]>;
  /** The courses each specialisation sits under, by specialisation name. */
  specialisationCourses: Record<string, string[]>;
  /** Courses and specialisations that can be taught online: the ones the editor offers an online option for. */
  onlineCourses?: string[];
  onlineSpecialisations?: string[];
  colleges: { slug: string; name: string }[];
  approvals: string[];
  tags: string[];
  states: string[];
  /** The districts of each state, for the City picker. */
  districts: Record<string, string[]>;
};

export async function adminGetCollegeRecord(token: string, slug: string): Promise<LoadedCollegeRecord> {
  return adminRequest<LoadedCollegeRecord>(token, "GET", `/admin/colleges/${encodeURIComponent(slug)}/record`);
}

export async function adminSaveCollegeRecord(token: string, slug: string, body: CollegeRecord) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/colleges/${encodeURIComponent(slug)}/record`, body);
}

export async function adminGetCollegePools(token: string): Promise<CollegePools> {
  return adminRequest<CollegePools>(token, "GET", "/admin/colleges/pools");
}

// ── Header of a listing page: the author and the intro text ───────────────

export type ListingPage = "colleges" | "courses";
/**
 * Empty name: no author row. Empty intro: the page writes its own from its data. Paragraphs are split
 * by a blank line. Empty title: the heading is written from the filters picked.
 */
export type ListingHeader = { name: string; role: string; photo: string; intro: string; title: string; /** Hides the author block; absent on older records. */ hideAuthor?: boolean };
/** What the API returns: `custom` is true when this selection (or the page, with no selection) has a header of its own. */
export type ListingHeaderRecord = ListingHeader & { custom: boolean };

/** A scope is one selection from the colleges menu, written as its filter: "course=MBA". */
const scopeQuery = (scope?: string) => (scope ? `?scope=${encodeURIComponent(scope)}` : "");

export async function getListingHeader(page: ListingPage, scope?: string): Promise<ListingHeaderRecord> {
  return apiFetch<ListingHeaderRecord>(`/listing-header/${page}${scopeQuery(scope)}`);
}

export async function adminGetListingHeader(token: string, page: ListingPage, scope?: string): Promise<ListingHeaderRecord> {
  return adminRequest<ListingHeaderRecord>(token, "GET", `/admin/listing-header/${page}${scopeQuery(scope)}`);
}

export async function adminPutListingHeader(token: string, page: ListingPage, value: ListingHeader, scope?: string) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/listing-header/${page}${scopeQuery(scope)}`, value);
}

export async function adminResetListingHeader(token: string, page: ListingPage, scope: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/listing-header/${page}${scopeQuery(scope)}`);
}

/** The selections that already have a header of their own. */
export async function adminListingHeaderScopes(token: string, page: ListingPage): Promise<string[]> {
  return adminRequest<string[]>(token, "GET", `/admin/listing-header/${page}/scopes`);
}

// ── What sits between the colleges on a listing page: banners, filter strips, ads ──

export type SlotType = "banner" | "filter" | "ad";
export type SlotPreset = "brand" | "amber" | "emerald" | "ocean" | "plum" | "night" | "cream";
export type SlotIcon = "compare" | "handshake" | "target" | "sparkles" | "graduation" | "none";
export type SlotGroup = "location" | "ranking" | "course" | "specialisation" | "credential" | "level" | "mode" | "fees" | "ownership" | "exam" | "approval";

/** The pages that take banners and ads: the colleges list, the news list, and one news story. */
export type SlotPage = "colleges" | "articles" | "article";

/** Where an item sits: between the listed items, above or below them all, in the left column (news list) or in the right-hand column. */
export type SlotPlacement = "inline" | "top" | "bottom" | "left" | "sidebar";

/** One item between the listed ones. Shown after `after` of them, and again every `every` more (0: once). In the sidebar, `after` counts the column's own blocks. */
export type ListingSlot = {
  id: string;
  type: SlotType;
  enabled: boolean;
  placement?: SlotPlacement;
  /** Story page only: the stories (slugs) it shows on. Empty or absent: every story. */
  articles?: string[];
  after: number;
  every: number;
  bgMode: "preset" | "gradient" | "solid" | "image";
  bgPreset: SlotPreset;
  bgFrom: string;
  bgTo: string;
  bgImage: string;
  /** "light" is white text, for a dark background. */
  tone: "light" | "dark";
  title: string;
  text: string;
  buttonLabel: string;
  buttonHref: string;
  icon: SlotIcon;
  sponsored: boolean;
  image: string;
  href: string;
  alt: string;
  group: SlotGroup;
  hint: string;
  limit: number;
};

/** What sits between the listed colleges. `custom` is true when this selection (or the page, with no selection) has a set of its own. */
export type ListingSlots = { slots: ListingSlot[]; custom: boolean };

/** The set for a selection of the header menu ("course=MBA"), else the page's. */
export async function getListingSlots(page: SlotPage, scope?: string): Promise<ListingSlots> {
  return apiFetch<ListingSlots>(`/listing-slots/${page}${scopeQuery(scope)}`);
}

export async function adminGetListingSlots(token: string, page: SlotPage, scope?: string): Promise<ListingSlots> {
  return adminRequest<ListingSlots>(token, "GET", `/admin/listing-slots/${page}${scopeQuery(scope)}`);
}

export async function adminPutListingSlots(token: string, page: SlotPage, slots: ListingSlot[], scope?: string) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/listing-slots/${page}${scopeQuery(scope)}`, { slots });
}

export async function adminResetListingSlots(token: string, page: SlotPage, scope: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/listing-slots/${page}${scopeQuery(scope)}`);
}

/** The selections that already have a set of their own. */
export async function adminListingSlotScopes(token: string, page: SlotPage): Promise<string[]> {
  return adminRequest<string[]>(token, "GET", `/admin/listing-slots/${page}/scopes`);
}

// ── A college's place in the ranking lists ────────────────────────────────

export type RankingListHead = { slug: string; name: string; authority: string; year: number; stream: string | null };
export type CollegeRankingEntry = RankingListHead & { rank: number; score: string | null };
export type CollegeRankings = { entries: CollegeRankingEntry[]; available: RankingListHead[] };

export async function adminGetCollegeRankings(token: string, collegeSlug: string): Promise<CollegeRankings> {
  return adminRequest<CollegeRankings>(token, "GET", `/admin/rankings/college/${encodeURIComponent(collegeSlug)}`);
}

export async function adminSetCollegeRanking(token: string, listSlug: string, collegeSlug: string, body: { rank: number; score: string | null }) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/rankings/${encodeURIComponent(listSlug)}/entries/${encodeURIComponent(collegeSlug)}`, body);
}

export async function adminRemoveCollegeRanking(token: string, listSlug: string, collegeSlug: string) {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/rankings/${encodeURIComponent(listSlug)}/entries/${encodeURIComponent(collegeSlug)}`);
}

// ── Notifications ─────────────────────────────────────────────────────────

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  requiresAck: boolean;
  read: boolean;
  acknowledgedAt: string | null;
  /** Set when someone else on the team dealt with it first. */
  handledBy: string | null;
  createdAt: string | null;
};

export type NotificationCount = { unread: number; pendingAck: number };

async function notificationCall<T>(token: string, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.message ?? `API ${res.status} on ${path}`);
  return json.data as T;
}

export const getNotifications = (token: string, limit = 20) =>
  notificationCall<NotificationItem[]>(token, "GET", `/notifications?limit=${limit}`);
export const getNotificationCount = (token: string) => notificationCall<NotificationCount>(token, "GET", "/notifications/count");
export const markNotificationsRead = (token: string) => notificationCall<{ ok: true }>(token, "POST", "/notifications/read", {});
export const acknowledgeNotification = (token: string, id: string) =>
  notificationCall<{ ok: true }>(token, "POST", `/notifications/${id}/acknowledge`);
export const acknowledgeAllNotifications = (token: string) => notificationCall<{ ok: true }>(token, "POST", "/notifications/acknowledge-all");
export const clearNotification = (token: string, id: string) => notificationCall<{ ok: true }>(token, "POST", `/notifications/${id}/clear`);
export const clearAllNotifications = (token: string) => notificationCall<{ ok: true }>(token, "POST", "/notifications/clear-all");
export const createSocketTicket = (token: string) => notificationCall<{ ticket: string }>(token, "POST", "/ws/ticket");

// ── Change requests and messages ──────────────────────────────────────────

export type ChangeRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type ChangeRequestItem = {
  id: string;
  kind: "edit" | "delete";
  status: ChangeRequestStatus;
  note: string | null;
  requestedBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string | null;
  decidedAt: string | null;
  collegeSlug: string | null;
  collegeName: string | null;
};

export type FieldChange = { path: string; before: unknown; after: unknown };

export type ChangeRequestDetail = ChangeRequestItem & {
  diff: FieldChange[];
  /** The live college was saved after the college admin began, so approving would overwrite that. */
  stale: boolean;
  threadId: string | null;
};

export type ThreadSummary = {
  id: string;
  subject: string;
  status: "open" | "resolved";
  resolvedBy: string | null;
  resolvedAt: string | null;
  changeRequestId: string | null;
  collegeSlug: string | null;
  collegeName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  messageCount: number;
  last: { side: "college" | "platform"; sender: string; body: string; at: string | null } | null;
};

export type ThreadMessage = { id: string; sender: string; side: "college" | "platform"; body: string; at: string | null };
export type ThreadDetail = ThreadSummary & { messages: ThreadMessage[] };

/** A paged admin list (the admin endpoints that return `{data, meta}`). */
async function pagedList<T>(
  token: string,
  path: string,
  params: Record<string, string | number | undefined>
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") qs.set(key, String(value));
  const query = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${API_BASE}${path}${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T[]; meta: PaginationMeta }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `API ${res.status} on ${path}`);
  }
  return { data: json.data, meta: json.meta };
}

// College admin
export const collegeSubmitRequest = (token: string, body: { kind: "edit" | "delete"; record?: CollegeRecord; note?: string }) =>
  adminRequest<ChangeRequestItem>(token, "POST", "/college/change-requests", body);
export const collegeListRequests = (token: string) => adminRequest<ChangeRequestItem[]>(token, "GET", "/college/change-requests");
export const collegeWithdrawRequest = (token: string, id: string) =>
  adminRequest<ChangeRequestItem>(token, "POST", `/college/change-requests/${id}/withdraw`);
export const collegeListThreads = (token: string) => adminRequest<ThreadSummary[]>(token, "GET", "/college/threads");
export const collegeGetThread = (token: string, id: string) => adminRequest<ThreadDetail>(token, "GET", `/college/threads/${id}`);
export const collegeStartThread = (token: string, body: { subject: string; body: string; changeRequestId?: string }) =>
  adminRequest<ThreadDetail>(token, "POST", "/college/threads", body);
export const collegeReplyThread = (token: string, id: string, body: string) =>
  adminRequest<ThreadDetail>(token, "POST", `/college/threads/${id}/messages`, { body });

// Platform team
export const adminListRequests = (token: string, params: { status?: "pending" | "decided" | "all"; page?: number; limit?: number }) =>
  pagedList<ChangeRequestItem>(token, "/admin/change-requests", params);
export const adminGetRequest = (token: string, id: string) => adminRequest<ChangeRequestDetail>(token, "GET", `/admin/change-requests/${id}`);
export const adminApproveRequest = (token: string, id: string, acknowledgeStale: boolean) =>
  adminRequest<{ status: string; kind: string; collegeSlug: string }>(token, "POST", `/admin/change-requests/${id}/approve`, { acknowledgeStale });
export const adminRejectRequest = (token: string, id: string, note: string) =>
  adminRequest<{ status: string }>(token, "POST", `/admin/change-requests/${id}/reject`, { note });
export const adminListThreads = (token: string, params: { status?: "open" | "resolved" | "all"; page?: number; limit?: number }) =>
  pagedList<ThreadSummary>(token, "/admin/threads", params);
export const adminGetThread = (token: string, id: string) => adminRequest<ThreadDetail>(token, "GET", `/admin/threads/${id}`);
export const adminReplyThread = (token: string, id: string, body: string) =>
  adminRequest<ThreadDetail>(token, "POST", `/admin/threads/${id}/messages`, { body });
export const adminResolveThread = (token: string, id: string) => adminRequest<ThreadDetail>(token, "POST", `/admin/threads/${id}/resolve`);

// ── The colleges menu in the header: what the admin decided about it ──────

/** `excluded` lists the institutes (by slug) the link's listing leaves out. */
/** `priority` gives institutes of the link's list a place: slug -> 1, 2, 3... (1 first). */
export type NavItemConfig = { label: string; hidden: boolean; seoTitle: string; seoDescription: string; excluded: string[]; priority: Record<string, number> };
/** `collections` are the slugs of collections added to the category, shown with its other links. */
export type NavGroupConfig = { label: string; hidden: boolean; limit: number; order: string[]; items: Record<string, NavItemConfig>; collections: string[] };
/** Nothing in a field means "as the directory has it". Groups are named by the menu's own ids ("course", "location"...). */
/** A category the admin added to the menu: a name and the collections it links to. Its id starts with "custom-". */
export type NavCustomGroup = { id: string; label: string; collections: string[] };
export type NavMenuConfig = { order: string[]; groups: Record<string, NavGroupConfig>; custom: NavCustomGroup[] };

/** The site has two header menus, each with its own saved choices. */
export type NavMenuName = "colleges" | "courses";

export async function getNavMenuConfig(menu: NavMenuName = "colleges"): Promise<NavMenuConfig> {
  return apiFetch<NavMenuConfig>(`/nav/${menu}-menu`);
}

/** The five figures on a course's card. Empty means not shown. */
export type CourseInfo = { duration: string; averageFees: string; examsAccepted: string[]; modes: string[]; eligibility: string; priority: number | null };

export async function adminPutCourseInfo(token: string, slug: string, info: CourseInfo) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/courses/${encodeURIComponent(slug)}/info`, info);
}

// ── Which colleges teach a course, and what each says about it ──────────

export type CollegeCourseRow = { specialisation: string; duration: string; mode: string; fees: string; exams: string[]; eligibility: string; seats: number | null };
export type CourseCollegesData = {
  course: { slug: string; name: string };
  colleges: { slug: string; name: string; city: string; stream: string; status: string; rows: CollegeCourseRow[] }[];
  /** The specialisations of this course in the catalogue. */
  specialisations: string[];
  exams: string[];
  modes: string[];
};

export async function adminGetCourseColleges(token: string, slug: string): Promise<CourseCollegesData> {
  return adminRequest<CourseCollegesData>(token, "GET", `/admin/courses/${encodeURIComponent(slug)}/colleges`);
}

export async function adminPutCourseColleges(token: string, slug: string, colleges: { slug: string; rows: CollegeCourseRow[] }[]) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/courses/${encodeURIComponent(slug)}/colleges`, { colleges });
}

// ── Which category comes first in each homepage section ──────────────────

export type CategoryPrioritySection = "topColleges" | "topExams" | "careers" | "universities";
/** Category names, first priority first, for each section. Empty: the Fields list's own order. */
export type CategoryPriority = Record<CategoryPrioritySection, string[]>;
export const NO_CATEGORY_PRIORITY: CategoryPriority = { topColleges: [], topExams: [], careers: [], universities: [] };

export async function getCategoryPriority(): Promise<CategoryPriority> {
  return apiFetch<CategoryPriority>("/home/category-priority");
}

export async function adminGetCategoryPriority(token: string): Promise<CategoryPriority> {
  return adminRequest<CategoryPriority>(token, "GET", "/admin/home-category-priority");
}

export async function adminPutCategoryPriority(token: string, section: CategoryPrioritySection, order: string[]) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/home-category-priority/${section}`, { order });
}

// ── Priority: which institutes come first ────────────────────────────────

export type PriorityRow = { slug: string; name: string; city: string; stream: string; status: string; priority: number | null; rank: number | null };

export async function adminGetDefaultPriorities(token: string): Promise<PriorityRow[]> {
  return adminRequest<PriorityRow[]>(token, "GET", "/admin/priority/default");
}

export async function adminSetDefaultPriorities(token: string, priorities: Record<string, number | null>) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/priority/default", { priorities });
}

export async function adminSetMenuPriorities(token: string, menu: string, priority: Record<string, number>) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/priority/menu", { menu, priority });
}

/** Who holds a rank in a ranking list. `exclude` is the college being edited, which may keep its own rank. */
export async function adminRankHolder(token: string, list: string, rank: number, exclude: string) {
  return adminRequest<{ holder: { slug: string; name: string } | null; list: string }>(token, "GET", `/admin/rankings/${encodeURIComponent(list)}/rank/${rank}?exclude=${encodeURIComponent(exclude)}`);
}

export async function adminGetNavMenuConfig(token: string, menu: NavMenuName = "colleges"): Promise<NavMenuConfig> {
  return adminRequest<NavMenuConfig>(token, "GET", `/admin/nav/${menu}-menu`);
}

export async function adminPutNavMenuConfig(token: string, value: NavMenuConfig, menu: NavMenuName = "colleges") {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/nav/${menu}-menu`, value);
}

// ── Log in and sign up pages ────────────────────────────────────────────────

/** What one of the two pages says, and its picture panel. */
export type AuthPageCopy = {
  heading: string;
  subheading: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  rememberLabel: string;
  submitLabel: string;
  dividerText: string;
  switchText: string;
  switchLink: string;
  /** /api/uploads/... Empty: the built-in coloured panel. */
  image: string;
  imageAlt: string;
  panelTitle: string;
  panelText: string;
  /** Short lines shown as small cards on the panel. */
  highlights: string[];
};
export type AuthPages = { login: AuthPageCopy; signup: AuthPageCopy };

export async function apiFetchAuthPage(): Promise<AuthPages> {
  return apiFetch<AuthPages>("/auth-page");
}

export async function adminGetAuthPage(token: string): Promise<AuthPages & { defaults: AuthPages }> {
  return adminRequest<AuthPages & { defaults: AuthPages }>(token, "GET", "/admin/auth-page");
}

export async function adminPutAuthPage(token: string, page: "login" | "signup", value: AuthPageCopy) {
  return adminRequest<{ message: string }>(token, "PUT", `/admin/auth-page/${page}`, value);
}

export async function adminResetAuthPage(token: string, page: "login" | "signup") {
  return adminRequest<{ message: string }>(token, "DELETE", `/admin/auth-page/${page}`);
}

// ── Header and footer arrangement ───────────────────────────────────────────

export type HeaderLinkId = "courses" | "colleges" | "compare" | "news";
export type HeaderItemConfig = { id: HeaderLinkId; label: string; hidden: boolean };

/** How the admin arranged the site's header and footer. Anything not named keeps its place after the ones that are. */
/** One logo spot: a picture (/api/uploads/...), some text, or both with the text beside the picture. All empty: the built-in logo. */
export type LogoConfig = { image: string; text: string; alt: string };

export type SiteChrome = {
  /** The header and the footer can have different logos. */
  headerLogo: LogoConfig;
  footerLogo: LogoConfig;
  headerItems: HeaderItemConfig[];
  /** Footer column titles, in the order to show them. */
  footerColumnOrder: string[];
  /** Each footer column's link addresses, in order, by column title. */
  footerLinkOrder: Record<string, string[]>;
};

export async function getSiteChrome(): Promise<SiteChrome> {
  return apiFetch<SiteChrome>("/site-chrome");
}

export async function adminGetSiteChrome(token: string): Promise<SiteChrome> {
  return adminRequest<SiteChrome>(token, "GET", "/admin/site-chrome");
}

export async function adminPutSiteChrome(token: string, value: SiteChrome) {
  return adminRequest<{ message: string }>(token, "PUT", "/admin/site-chrome", value);
}

// ── Recruiters ──────────────────────────────────────────────────────────────

/** A recruiting company as a page shows it. */
export type RecruiterBrief = { name: string; logo: string; showName: boolean };

/** A company in the shared pool the college editor searches. */
export type AdminRecruiter = { id: string; name: string; logo: string; showName: boolean };

export async function adminListRecruiters(token: string): Promise<AdminRecruiter[]> {
  return adminRequest<AdminRecruiter[]>(token, "GET", "/admin/recruiters");
}

export async function adminCreateRecruiter(token: string, name: string) {
  return adminRequest<AdminRecruiter & { existing: boolean }>(token, "POST", "/admin/recruiters", { name });
}

export async function adminUpdateRecruiter(token: string, id: string, patch: { logo?: string; showName?: boolean }) {
  return adminRequest<AdminRecruiter>(token, "PATCH", `/admin/recruiters/${encodeURIComponent(id)}`, patch);
}
