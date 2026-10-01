/**
 * API client for the FastAPI backend.
 *
 * All fetches run in Server Components (async RSC) — data is fetched directly
 * from the FastAPI origin, never via a Next.js Route Handler in between.
 * (Next.js 16 docs explicitly recommend this to avoid the extra HTTP round-trip
 * and build-time failures that occur when Server Components call Route Handlers.)
 */

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

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status} on ${url}`);
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

async function apiListFetch<T>(
  path: string
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status} on ${url}`);
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
  placement?: Placement;
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

export type CollegeParams = {
  page?: number;
  limit?: number;
  stream?: string;
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
export async function getCollege(slug: string): Promise<College> {
  return apiFetch<College>(`/colleges/${slug}`);
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
  const res = await getExams({ limit: 200 });
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
export async function search(q: string) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}
