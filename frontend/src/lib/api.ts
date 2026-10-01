/**
 * API client for the FastAPI backend.
 *
 * All fetches run in Server Components (async RSC) — data is fetched directly
 * from the FastAPI origin, never via a Next.js Route Handler in between.
 * (Next.js 16 docs explicitly recommend this to avoid the extra HTTP round-trip
 * and build-time failures that occur when Server Components call Route Handlers.)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type ApiResponse<T> = { success: true; data: T };
type ApiListResponse<T> = {
  success: true;
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
};

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    // No-store keeps listings fresh on every request in development.
    // In production, wrap hot paths with React.cache or use revalidate.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${url}`);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

async function apiListFetch<T>(path: string): Promise<{ data: T[]; meta: { total: number; page: number; limit: number; pages: number } }> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${url}`);
  }
  const json = (await res.json()) as ApiListResponse<T>;
  return { data: json.data, meta: json.meta };
}

// ── Types ─────────────────────────────────────────────────────────────────────
// Mirror of mock-data.ts types — kept here so pages can import from one place.

export type Ranking = { authority: string; rank: number };
export type RatingBreakdown = { label: string; score: number };
export type Course = { name: string; duration: string; mode: string; fees: string; exams: string[] };
export type Placement = { year: number; average: string; median: string; highest: string; topRecruiters: string[] };
export type Cutoff = { exam: string; category: string; score: string };
export type Review = { author: string; course: string; batch: string; verified: boolean; date: string; rating: number; body: string };

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
  // Detail-only fields
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
};

export type Location = { slug: string; name: string; state: string; collegeCount: number };

export type Article = { slug: string; title: string; excerpt: string; date: string; body?: string };

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
export type CareerPanel = { title: string; viewAllHref: string; links: CareerPanelLink[] };

export type DataHighlightLink = { label: string; href: string };
export type DataHighlight = { slug: string; title: string; description: string; links: DataHighlightLink[] };

export type RecommendedUniversity = { slug: string; name: string; city: string; state: string };

export type StreamCount = { name: string; count: number };

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

// ── API functions ─────────────────────────────────────────────────────────────

/** Single call that populates the entire home page. */
export async function getHomeData(): Promise<HomeData> {
  return apiFetch<HomeData>("/home");
}

/** College listing with optional filters/search. */
export async function getColleges(params?: {
  page?: number;
  limit?: number;
  stream?: string;
  city?: string;
  ownership?: string;
  sort?: string;
  featured?: boolean;
  q?: string;
}): Promise<{ data: College[]; meta: { total: number; page: number; limit: number; pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.stream) qs.set("stream", params.stream);
  if (params?.city) qs.set("city", params.city);
  if (params?.ownership) qs.set("ownership", params.ownership);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.featured !== undefined) qs.set("featured", String(params.featured));
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<College>(`/colleges${query}`);
}

/** Full college detail by slug. */
export async function getCollege(slug: string): Promise<College> {
  return apiFetch<College>(`/colleges/${slug}`);
}

/** Related colleges for the detail sidebar. */
export async function getRelatedColleges(slug: string, limit = 3): Promise<College[]> {
  return apiFetch<College[]>(`/colleges/${slug}/related?limit=${limit}`);
}

/** All college slugs — used by generateStaticParams. */
export async function getCollegeSlugs(): Promise<string[]> {
  return apiFetch<string[]>("/colleges/slugs");
}

/** Exam listing. */
export async function getExams(params?: {
  page?: number;
  limit?: number;
  stream?: string;
  featured?: boolean;
}): Promise<{ data: Exam[]; meta: { total: number; page: number; limit: number; pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.stream) qs.set("stream", params.stream);
  if (params?.featured !== undefined) qs.set("featured", String(params.featured));
  const query = qs.toString() ? `?${qs}` : "";
  return apiListFetch<Exam>(`/exams${query}`);
}

/** All locations. */
export async function getLocations(): Promise<Location[]> {
  return apiFetch<Location[]>("/locations");
}

/** Recent articles. */
export async function getArticles(limit = 3): Promise<Article[]> {
  const res = await apiListFetch<Article>(`/articles?limit=${limit}`);
  return res.data;
}

/** Submit a lead (callback, counselling, brochure, enquiry). */
export async function submitLead(data: {
  name: string;
  phone: string;
  email?: string;
  collegeSlug?: string;
  type: "callback" | "counselling" | "brochure" | "enquiry";
}): Promise<{ id: string; message: string }> {
  const url = `${API_BASE}/leads`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to submit");
  return json.data;
}

/** Subscribe to newsletter. */
export async function subscribeNewsletter(email: string): Promise<{ message: string }> {
  const url = `${API_BASE}/newsletter/subscribe`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Subscription failed");
  return json.data;
}

/** Full-text search. */
export async function search(q: string) {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}
