import { API_BASE, adminRequest, apiJson } from "@/lib/api";

/**
 * Exam communities: what the site and the admin read and send. The API makes every decision (who may post, what a
 * visitor who is not signed in may read); these only carry the calls. See backend/routers/community.py.
 */

export const POST_KINDS = ["discussion", "question", "suggestion", "banner", "achievement"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const REACTIONS = ["like", "love", "celebrate", "insightful"] as const;
export type Reaction = (typeof REACTIONS)[number];

export type CommunitySummary = { id: string; examSlug: string; examName: string; members: number; posts: number; createdAt: string | null };

export type CommunityViewer = { signedIn: boolean; blocked: boolean; adminAccount: boolean; member: boolean };

export type ExamCommunity = {
  exam: { slug: string; name: string };
  /** Null: nobody has started it yet (or the team restricted it: `restricted`). */
  community: { id: string; description: string; members: number; posts: number; startedBy: string | null; createdAt: string | null } | null;
  restricted: boolean;
  viewer: CommunityViewer;
};

export type CommunityReply = { id: string; body: string; author: string; authorAvatar: string; createdAt: string | null; mine: boolean };

export type CommunityPost = {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  image: string;
  author: string;
  authorAvatar: string;
  createdAt: string | null;
  replies: CommunityReply[];
  replyCount: number;
  reactions: Record<Reaction, number>;
  myReaction: Reaction | null;
  mine: boolean;
};

export type CommunityPostsPage = { items: CommunityPost[]; total: number; offset: number; hasMore: boolean; locked: boolean };

const bearer = (token?: string | null): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

async function send<T>(method: string, path: string, token: string | null, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    cache: "no-store",
    headers: { ...bearer(token), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return apiJson<T>(res);
}

/** Every open community, for the exams listing. A failure is an empty list: the listing still renders. */
export async function getCommunities(): Promise<CommunitySummary[]> {
  try {
    return await send<CommunitySummary[]>("GET", "/communities", null);
  } catch {
    return [];
  }
}

export const getExamCommunity = (examSlug: string, token: string | null) =>
  send<ExamCommunity>("GET", `/exams/${encodeURIComponent(examSlug)}/community`, token);

export function getCommunityPosts(communityId: string, token: string | null, opts: { offset?: number; limit?: number; kind?: PostKind | null } = {}) {
  const qs = new URLSearchParams();
  if (opts.offset) qs.set("offset", String(opts.offset));
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.kind) qs.set("kind", opts.kind);
  const query = qs.toString() ? `?${qs}` : "";
  return send<CommunityPostsPage>("GET", `/communities/${encodeURIComponent(communityId)}/posts${query}`, token);
}

export const postStartCommunity = (examSlug: string, description: string, token: string) =>
  send<{ id: string; message: string }>("POST", `/exams/${encodeURIComponent(examSlug)}/community`, token, { description });

export const postJoin = (communityId: string, token: string) => send<{ member: boolean }>("POST", `/communities/${encodeURIComponent(communityId)}/join`, token);
export const deleteJoin = (communityId: string, token: string) => send<{ member: boolean }>("DELETE", `/communities/${encodeURIComponent(communityId)}/join`, token);

export const postCommunityPost = (communityId: string, body: { kind: PostKind; title: string; body: string; image: string }, token: string) =>
  send<{ id: string; message: string }>("POST", `/communities/${encodeURIComponent(communityId)}/posts`, token, body);

export const deleteCommunityPost = (postId: string, token: string) => send<{ message: string }>("DELETE", `/community/posts/${encodeURIComponent(postId)}`, token);

export const postCommunityReply = (postId: string, body: string, token: string) =>
  send<CommunityReply>("POST", `/community/posts/${encodeURIComponent(postId)}/replies`, token, { body });

export const deleteCommunityReply = (replyId: string, token: string) => send<{ message: string }>("DELETE", `/community/replies/${encodeURIComponent(replyId)}`, token);

export const putReaction = (postId: string, reaction: Reaction | null, token: string) =>
  send<{ reactions: Record<Reaction, number>; myReaction: Reaction | null }>("PUT", `/community/posts/${encodeURIComponent(postId)}/reaction`, token, { reaction });

export async function uploadCommunityImage(file: File, token: string): Promise<{ url: string }> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch(`${API_BASE}/community/uploads`, { method: "POST", headers: bearer(token), body: form, cache: "no-store" });
  return apiJson(res);
}

// ── Admin ───────────────────────────────────────────────────────────────────

export type AdminCommunityPerson = { id: string | null; name: string; email: string; flagged: boolean; blocked: boolean };

export type AdminCommunityOverview = {
  totals: { communities: number; posts: number; postsToday: number; replies: number; hidden: number; flagged: number; blocked: number };
  communities: {
    id: string;
    examSlug: string;
    examName: string;
    description: string;
    startedBy: string;
    restricted: boolean;
    members: number;
    posts: number;
    hiddenPosts: number;
    createdAt: string | null;
  }[];
};

export type AdminCommunityReply = { id: string; body: string; hidden: boolean; hiddenReason: string; createdAt: string | null; author: AdminCommunityPerson };

export type AdminCommunityPost = {
  id: string;
  communityId: string;
  examName: string;
  kind: PostKind;
  title: string;
  body: string;
  image: string;
  hidden: boolean;
  hiddenReason: string;
  createdAt: string | null;
  author: AdminCommunityPerson;
  reactions: number;
  replies: AdminCommunityReply[];
};

export type AdminCommunityUser = AdminCommunityPerson & { note: string; posts: number; replies: number; communities: number; updatedAt: string | null };

export type Paged<T> = { items: T[]; total: number; page: number; pages: number };

export const adminCommunityOverview = (token: string) => adminRequest<AdminCommunityOverview>(token, "GET", "/admin/community/overview");

export function adminCommunityPosts(token: string, f: { community?: string; status?: string; kind?: string; q?: string; user?: string; page?: number }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  return adminRequest<Paged<AdminCommunityPost>>(token, "GET", `/admin/community/posts${qs.toString() ? `?${qs}` : ""}`);
}

export function adminCommunityUsers(token: string, f: { status?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") qs.set(k, String(v));
  return adminRequest<Paged<AdminCommunityUser>>(token, "GET", `/admin/community/users${qs.toString() ? `?${qs}` : ""}`);
}

export const adminHidePost = (token: string, id: string, hidden: boolean, reason: string) =>
  adminRequest<{ message: string }>(token, "PUT", `/admin/community/posts/${encodeURIComponent(id)}/hidden`, { hidden, reason });
export const adminDeletePost = (token: string, id: string) => adminRequest<{ message: string }>(token, "DELETE", `/admin/community/posts/${encodeURIComponent(id)}`);
export const adminHideReply = (token: string, id: string, hidden: boolean, reason: string) =>
  adminRequest<{ message: string }>(token, "PUT", `/admin/community/replies/${encodeURIComponent(id)}/hidden`, { hidden, reason });
export const adminDeleteReply = (token: string, id: string) => adminRequest<{ message: string }>(token, "DELETE", `/admin/community/replies/${encodeURIComponent(id)}`);
export const adminRestrictCommunity = (token: string, id: string, restricted: boolean) =>
  adminRequest<{ message: string }>(token, "PUT", `/admin/community/communities/${encodeURIComponent(id)}`, { restricted });
export const adminDeleteCommunity = (token: string, id: string) => adminRequest<{ message: string }>(token, "DELETE", `/admin/community/communities/${encodeURIComponent(id)}`);
export const adminSetStanding = (token: string, userId: string, body: { flagged?: boolean; blocked?: boolean; note?: string }) =>
  adminRequest<{ message: string; flagged: boolean; blocked: boolean }>(token, "PUT", `/admin/community/users/${encodeURIComponent(userId)}`, body);
