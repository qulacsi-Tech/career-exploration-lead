/**
 * API client for the FastAPI backend.
 *
 * All fetches run in Server Components (async RSC) — data is fetched directly
 * from the FastAPI origin, never via a Next.js Route Handler in between.
 * (Next.js 16 docs explicitly recommend this to avoid the extra HTTP round-trip
 * and build-time failures that occur when Server Components call Route Handlers.)
 */

import type { RichTextDoc } from "@/lib/rich-text";

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

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} on ${url}`);
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

async function apiListFetch<T>(
  path: string
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status} on ${url}`);
  const json = (await res.json()) as ApiListResponse<T>;
  return { data: json.data, meta: json.meta };
}

// ── Types — mirror of frontend mock-data.ts and articles-data.ts ──────────

export type Ranking = { authority: string; rank: number };
export type RatingBreakdown = { label: string; score: number };
export type Course = {
  name: string;
  duration: string;
  mode: string;
  fees: string;
  exams: string[];
};
export type Placement = {
  year: number;
  average: string;
  median: string;
  highest: string;
  topRecruiters: string[];
};
export type Cutoff = { exam: string; category: string; score: string };
export type Review = {
  author: string;
  course: string;
  batch: string;
  verified: boolean;
  date: string;
  rating: number;
  body: string;
};

export type College = {
  slug: string;
  name: string;
  city: string;
  state: string;
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
};

export type Exam = {
  slug: string;
  name: string;
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
};

export type Location = {
  slug: string;
  name: string;
  state: string;
  collegeCount: number;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author?: string;
  category?: string;
  readMinutes?: number;
  // Detail only
  body?: string;
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
};

export type CareerPanelLink = { label: string; href: string };
export type CareerPanel = {
  title: string;
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
};

/** homeStreams now has slug so it matches mock-data.ts homeStreams */
export type StreamCount = { slug: string; name: string; count: number };

export type HomeData = {
  featuredColleges: College[];
  featuredExams: Exam[];
  locations: Location[];
  articles: Article[];
  recommendedPrograms: RecommendedProgram[];
  careerPanels: CareerPanel[];
  recommendedUniversities: RecommendedUniversity[];
  dataHighlights: DataHighlight[];
  streams: StreamCount[];
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
export type CollegeDetail = Omit<College, "ratingBreakdown" | "placement" | "cutoffs" | "reviews"> & {
  ratingBreakdown: RatingBreakdown[];
  placement: Placement | null;
  cutoffs: Cutoff[];
  reviews: Review[];
};

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
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<College>(`/colleges${query}`);
}

/** Full college detail by slug (includes courses, placement, cutoffs, reviews). */
export async function getCollege(slug: string): Promise<CollegeDetail> {
  return apiFetch<CollegeDetail>(`/colleges/${slug}`);
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
  return apiFetch<College[]>(`/colleges/${slug}/related?limit=${limit}`);
}

/** Similar colleges for the peer-grid on the college detail page. */
export async function getSimilarColleges(
  slug: string,
  limit = 8
): Promise<College[]> {
  return apiFetch<College[]>(`/colleges/similar?slug=${encodeURIComponent(slug)}&limit=${limit}`);
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
  params?: { page?: number; limit?: number }
): Promise<{ data: Article[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
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

/** Submit a lead (callback, counselling, brochure, enquiry). */
export async function submitLead(data: {
  name: string;
  phone: string;
  email?: string;
  collegeSlug?: string;
  type: "callback" | "counselling" | "brochure" | "enquiry";
}): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to submit");
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
}): Promise<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Registration failed");
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
  // Detail only
  specialisations?: Specialisation[];
};

// ── Ranking types ─────────────────────────────────────────────────────────

export type RankingEntry = { collegeSlug: string; rank: number; score?: string };
export type RankingList = {
  slug: string;
  name: string;
  authority: string;
  year: number;
  stream?: string;
  entries: RankingEntry[];
};

// ── Auth types ────────────────────────────────────────────────────────────

export type AuthUser = { id: string; name: string; email: string; role: string };
export type AuthResult = { accessToken: string; user: AuthUser };

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

export type CollectionScope = {
  programSlug?: string;
  locationSlug?: string;
  examSlug?: string;
  courseSlug?: string;
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
  scope: CollectionScope;
  collegeSlugs: string[];
  rankingListSlug: string;
  seo: CollectionSeo;
  placements: CollectionPlacements;
  isPublished: boolean;
  updatedAt: string;
};

export type CollectionBand = { collection: Collection; colleges: College[] };

export type FooterColumn = {
  title: string;
  links: { label: string; href: string; order: number }[];
};

export type CollectionPagePayload = {
  collection: Collection;
  colleges: College[];
  related: { slug: string; title: string; count: number }[];
  canonical: string;
};

/** Homepage bands: published, visible, in editor order, each with its colleges. */
export async function getCollectionBands(): Promise<CollectionBand[]> {
  return apiFetch<CollectionBand[]>("/collections/homepage");
}

/** Footer link columns built from the collections placed in them. */
export async function getFooterColumns(): Promise<FooterColumn[]> {
  return apiFetch<FooterColumn[]>("/collections/footer");
}

/** Slugs of published collections, for generateStaticParams. */
export async function getCollectionSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/collections/slugs");
}

/** A published collection's page: its colleges, related collections, and canonical URL. */
export async function getCollectionPage(slug: string): Promise<CollectionPagePayload> {
  return apiFetch<CollectionPagePayload>(`/collections/${slug}/page`);
}

// ── Admin catalogue (courses and specialisations) ───────────────────────────

export type AdminSpecialisation = {
  id: string;
  slug: string;
  name: string;
  courseSlug: string;
  courseName: string;
  stream: string;
  duration: string | null;
  averageFees: string | null;
  collegeCount: number;
  about: string | null;
};

export type AdminCourse = {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  level: "UG" | "PG" | "Diploma" | "Doctorate";
  stream: string;
  duration: string;
  modes: string[];
  eligibility: string | null;
  averageFees: string | null;
  examsAccepted: string[];
  collegeCount: number;
  about: string | null;
  isPublished: boolean;
  specialisations: AdminSpecialisation[];
};

export async function adminGetCatalogue(token: string): Promise<AdminCourse[]> {
  return adminRequest<AdminCourse[]>(token, "GET", "/admin/catalogue");
}

export async function adminCreateCourse(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/courses", body);
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

// ── Admin rankings ─────────────────────────────────────────────────────────

export type AdminRankingEntry = { collegeSlug: string; rank: number; score: string | null };

export type AdminRanking = {
  id: string;
  slug: string;
  name: string;
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
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.success !== true) {
    const message = json && json.success === false ? json.error?.message : undefined;
    throw new ApiError(res.status, message ?? `Admin API ${res.status}`);
  }
  return json.data;
}

/** Admin: create a college. The slug must be new. */
export async function adminCreateCollege(token: string, body: Record<string, unknown>) {
  return adminRequest<{ message: string }>(token, "POST", "/admin/colleges", body);
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

/** Admin: the figures for the dashboard, computed by the API from the database. */
export async function adminGetDashboard(token: string): Promise<AdminDashboard> {
  return adminRequest<AdminDashboard>(token, "GET", "/admin/dashboard");
}
