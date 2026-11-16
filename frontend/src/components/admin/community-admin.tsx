"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ExternalLink, Eye, EyeOff, Flag, Lock, MessagesSquare, Search, ShieldCheck, Trash2, Unlock } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { formatFull } from "@/lib/lead-labels";
import { deleteCommunity, deletePost, deleteReply, hidePost, hideReply, restrictCommunity, setStanding, type ModerationResult } from "@/lib/community-admin-actions";
import { POST_KINDS, type AdminCommunityOverview, type AdminCommunityPerson, type AdminCommunityPost, type AdminCommunityUser, type Paged } from "@/lib/community-api";

export type CommunityTab = "posts" | "people" | "communities";
type Filters = { community?: string; status?: string; kind?: string; q?: string; user?: string; page: number };

const KIND_LABEL: Record<string, string> = { discussion: "Discussion", question: "Question", suggestion: "Suggestion", banner: "Banner", achievement: "Achievement" };

const when = (iso: string | null) => (iso ? formatFull(iso) : "");

/** The address for a view with some filters changed. Changing a filter goes back to page 1. */
function hrefFor(tab: CommunityTab, filters: Filters, change: Partial<Filters> = {}) {
  const next: Record<string, string | number | undefined> = { ...filters, page: undefined, ...change, tab: tab === "posts" ? undefined : tab };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) qs.set(k, String(v));
  return `/admin/community${qs.toString() ? `?${qs}` : ""}`;
}

export function CommunityAdmin({
  tab,
  filters,
  overview,
  posts,
  people,
}: {
  tab: CommunityTab;
  filters: Filters;
  overview: AdminCommunityOverview;
  posts: Paged<AdminCommunityPost> | null;
  people: Paged<AdminCommunityUser> | null;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<ModerationResult | null>(null);
  const [pending, start] = useTransition();

  /** Runs a moderation action, says how it went, and reads the page again. */
  const act = (call: () => Promise<ModerationResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const result = await call();
      setToast(result);
      if (result.ok) router.refresh();
    });
  };

  const t = overview.totals;
  const stats = [
    { label: "Communities", value: t.communities },
    { label: "Posts", value: t.posts },
    { label: "Posts in 24 h", value: t.postsToday },
    { label: "Replies", value: t.replies },
    { label: "Hidden posts", value: t.hidden, href: hrefFor("posts", { page: 1 }, { status: "hidden" }) },
    { label: "Flagged people", value: t.flagged, href: hrefFor("people", { page: 1 }, { status: "flagged" }) },
    { label: "Blocked people", value: t.blocked, href: hrefFor("people", { page: 1 }, { status: "blocked" }) },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => {
          const body = (
            <>
              <dd className="font-display text-2xl font-extrabold text-ink">{s.value.toLocaleString("en-IN")}</dd>
              <dt className="mt-0.5 text-xs font-semibold text-ink-soft">{s.label}</dt>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-brand">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3">
              {body}
            </div>
          );
        })}
      </dl>

      <nav className="flex gap-1 border-b border-line" aria-label="Community views">
        {(
          [
            ["posts", "Posts & replies"],
            ["people", "People"],
            ["communities", "Communities"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={hrefFor(key, { page: 1 })}
            aria-current={tab === key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${tab === key ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {toast && (
        <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {toast.message}
        </p>
      )}

      {tab === "posts" && posts && <PostsView posts={posts} filters={filters} overview={overview} act={act} pending={pending} />}
      {tab === "people" && people && <PeopleView people={people} filters={filters} act={act} pending={pending} />}
      {tab === "communities" && <CommunitiesView overview={overview} act={act} pending={pending} />}
    </div>
  );
}

type Act = (call: () => Promise<ModerationResult>, confirmText?: string) => void;

function Pager({ tab, filters, page, pages, total, noun }: { tab: CommunityTab; filters: Filters; page: number; pages: number; total: number; noun: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-ink-soft">
      <span>
        {total.toLocaleString("en-IN")} {noun}
      </span>
      {pages > 1 && (
        <span className="flex items-center gap-2">
          {page > 1 && (
            <Link href={hrefFor(tab, filters, { page: page - 1 })} className="rounded-lg border border-line px-3 py-1 hover:border-brand">
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={hrefFor(tab, filters, { page: page + 1 })} className="rounded-lg border border-line px-3 py-1 hover:border-brand">
              Next
            </Link>
          )}
        </span>
      )}
    </div>
  );
}

function PersonLine({ person, act, pending }: { person: AdminCommunityPerson; act: Act; pending: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-semibold text-ink">{person.name}</span>
      {person.email && <span className="text-ink-faint">{person.email}</span>}
      {person.flagged && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">Flagged</span>}
      {person.blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">Blocked</span>}
      {person.id && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => act(() => setStanding(person.id as string, { flagged: !person.flagged }))}
            className="rounded px-1.5 py-0.5 font-semibold text-ink-soft hover:bg-amber-50 hover:text-amber-800"
          >
            {person.flagged ? "Unflag" : "Flag"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              act(
                () => setStanding(person.id as string, { blocked: !person.blocked }),
                person.blocked ? undefined : `Block ${person.name}? They will still be able to read communities, but not post, reply, react or join.`,
              )
            }
            className="rounded px-1.5 py-0.5 font-semibold text-ink-soft hover:bg-red-50 hover:text-red-700"
          >
            {person.blocked ? "Unblock" : "Block"}
          </button>
          <Link href={hrefFor("posts", { page: 1 }, { user: person.id })} className="rounded px-1.5 py-0.5 font-semibold text-brand hover:underline">
            Their posts
          </Link>
        </>
      )}
    </span>
  );
}

function PostsView({ posts, filters, overview, act, pending }: { posts: Paged<AdminCommunityPost>; filters: Filters; overview: AdminCommunityOverview; act: Act; pending: boolean }) {
  const router = useRouter();
  const hide = (hidden: boolean, run: (reason: string) => Promise<ModerationResult>) => {
    if (!hidden) return act(() => run(""));
    const reason = window.prompt("Why is it being hidden? (optional, for the team)", "");
    if (reason === null) return;
    act(() => run(reason.slice(0, 300)));
  };

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          router.push(hrefFor("posts", filters, { q: String(f.get("q") ?? ""), community: String(f.get("community") ?? ""), status: String(f.get("status") ?? ""), kind: String(f.get("kind") ?? "") }));
        }}
      >
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search posts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input name="q" defaultValue={filters.q ?? ""} placeholder="Search post text" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm" />
        </label>
        <select name="community" defaultValue={filters.community ?? ""} aria-label="Community" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="">All communities</option>
          {overview.communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.examName}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Status" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="">Visible and hidden</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <select name="kind" defaultValue={filters.kind ?? ""} aria-label="Kind" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="">Every kind</option>
          {POST_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Apply
        </button>
        {(filters.q || filters.community || filters.status || filters.kind || filters.user) && (
          <Link href="/admin/community" className="px-2 py-2 text-sm font-medium text-ink-soft hover:text-brand">
            Clear
          </Link>
        )}
      </form>
      {filters.user && <p className="text-sm text-ink-soft">Showing one person&apos;s posts.</p>}

      <Pager tab="posts" filters={filters} page={posts.page} pages={posts.pages} total={posts.total} noun="posts" />

      {posts.items.length === 0 && <p className="rounded-xl border border-dashed border-line bg-bg-alt px-6 py-10 text-center text-sm text-ink-soft">No posts match.</p>}

      {posts.items.map((p) => (
        <article key={p.id} className={`rounded-xl border bg-surface p-4 ${p.hidden ? "border-amber-300 bg-amber-50/40" : "border-line"}`}>
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-soft px-2 py-0.5 font-bold text-brand-ink">{p.examName}</span>
                <span className="rounded-full bg-bg-alt px-2 py-0.5 font-semibold text-ink-soft">{KIND_LABEL[p.kind] ?? p.kind}</span>
                <span className="text-ink-faint">{when(p.createdAt)}</span>
                <span className="text-ink-faint">· {p.reactions} reactions</span>
                {p.hidden && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 font-bold text-amber-900">
                    Hidden{p.hiddenReason ? `: ${p.hiddenReason}` : ""}
                  </span>
                )}
              </p>
              <PersonLine person={p.author} act={act} pending={pending} />
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => hide(!p.hidden, (reason) => hidePost(p.id, !p.hidden, reason))}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-amber-400 hover:text-amber-800"
              >
                {p.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {p.hidden ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => deletePost(p.id), "Delete this post with its replies and reactions? This cannot be undone.")}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-red-400 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </header>
          {p.title && <h3 className="mt-3 font-semibold text-ink">{p.title}</h3>}
          <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink">{p.body}</p>
          {p.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(p.image)} alt="" className="mt-3 max-h-56 rounded-lg border border-line" />
          )}

          {p.replies.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-line-soft pt-3">
              {p.replies.map((r) => (
                <li key={r.id} className={`rounded-lg px-3 py-2 ${r.hidden ? "bg-amber-50" : "bg-bg-alt"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <PersonLine person={r.author} act={act} pending={pending} />
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-ink-faint">{when(r.createdAt)}</span>
                      {r.hidden && <span className="rounded-full bg-amber-200 px-2 py-0.5 font-bold text-amber-900">Hidden</span>}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => hide(!r.hidden, (reason) => hideReply(r.id, !r.hidden, reason))}
                        className="rounded px-1.5 py-0.5 font-semibold text-ink-soft hover:text-amber-800"
                      >
                        {r.hidden ? "Show" : "Hide"}
                      </button>
                      <button type="button" disabled={pending} onClick={() => act(() => deleteReply(r.id), "Delete this reply?")} className="rounded px-1.5 py-0.5 font-semibold text-ink-soft hover:text-red-700">
                        Delete
                      </button>
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-ink">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}

      <Pager tab="posts" filters={filters} page={posts.page} pages={posts.pages} total={posts.total} noun="posts" />
    </div>
  );
}

function PeopleView({ people, filters, act, pending }: { people: Paged<AdminCommunityUser>; filters: Filters; act: Act; pending: boolean }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          router.push(hrefFor("people", filters, { q: String(f.get("q") ?? ""), status: String(f.get("status") ?? "") }));
        }}
      >
        <input name="q" defaultValue={filters.q ?? ""} placeholder="Search name or email" aria-label="Search people" className="min-w-[14rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Standing" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="">Everyone</option>
          <option value="flagged">Flagged</option>
          <option value="blocked">Blocked</option>
        </select>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Apply
        </button>
      </form>

      <Pager tab="people" filters={filters} page={people.page} pages={people.pages} total={people.total} noun="people" />

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-bg-alt text-left text-xs font-semibold text-ink-soft">
            <tr>
              <th className="px-4 py-2.5">Person</th>
              <th className="px-3 py-2.5 text-right">Communities</th>
              <th className="px-3 py-2.5 text-right">Posts</th>
              <th className="px-3 py-2.5 text-right">Replies</th>
              <th className="px-3 py-2.5">Standing</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {people.items.map((u) => (
              <tr key={u.id ?? u.email}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-ink-faint">{u.email}</p>
                  {u.note && <p className="mt-0.5 text-xs italic text-ink-soft">Note: {u.note}</p>}
                </td>
                <td className="px-3 py-3 text-right">{u.communities}</td>
                <td className="px-3 py-3 text-right">
                  {u.posts > 0 && u.id ? (
                    <Link href={hrefFor("posts", { page: 1 }, { user: u.id })} className="font-semibold text-brand hover:underline">
                      {u.posts}
                    </Link>
                  ) : (
                    u.posts
                  )}
                </td>
                <td className="px-3 py-3 text-right">{u.replies}</td>
                <td className="px-3 py-3">
                  <span className="flex flex-wrap gap-1">
                    {u.blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Blocked</span>}
                    {u.flagged && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Flagged</span>}
                    {!u.blocked && !u.flagged && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" /> Good
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.id && (
                    <span className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act(() => setStanding(u.id as string, { flagged: !u.flagged }))}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-amber-400 hover:text-amber-800"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {u.flagged ? "Unflag" : "Flag"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(
                            () => setStanding(u.id as string, { blocked: !u.blocked }),
                            u.blocked ? undefined : `Block ${u.name}? They will still be able to read communities, but not post, reply, react or join.`,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-red-400 hover:text-red-700"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {u.blocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const note = window.prompt(`A note about ${u.name} for the team`, u.note);
                          if (note !== null) act(() => setStanding(u.id as string, { note: note.slice(0, 300) }));
                        }}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand"
                      >
                        Note
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {people.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                  Nobody matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunitiesView({ overview, act, pending }: { overview: AdminCommunityOverview; act: Act; pending: boolean }) {
  if (overview.communities.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-bg-alt px-6 py-10 text-center text-sm text-ink-soft">
        <MessagesSquare className="mx-auto mb-2 h-6 w-6 text-ink-faint" />
        No communities yet. The first student to open an exam&apos;s community page can start one.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-bg-alt text-left text-xs font-semibold text-ink-soft">
          <tr>
            <th className="px-4 py-2.5">Exam</th>
            <th className="px-3 py-2.5">Started by</th>
            <th className="px-3 py-2.5 text-right">Members</th>
            <th className="px-3 py-2.5 text-right">Posts</th>
            <th className="px-3 py-2.5 text-right">Hidden</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {overview.communities.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">{c.examName}</p>
                <p className="text-xs text-ink-faint">Since {when(c.createdAt)}</p>
              </td>
              <td className="px-3 py-3 text-ink-soft">{c.startedBy || "—"}</td>
              <td className="px-3 py-3 text-right">{c.members}</td>
              <td className="px-3 py-3 text-right">
                <Link href={hrefFor("posts", { page: 1 }, { community: c.id })} className="font-semibold text-brand hover:underline">
                  {c.posts}
                </Link>
              </td>
              <td className="px-3 py-3 text-right">{c.hiddenPosts}</td>
              <td className="px-3 py-3">
                {c.restricted ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Restricted</span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Open</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="flex justify-end gap-1.5">
                  <a
                    href={`/exams/${c.examSlug}/community`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open the ${c.examName} community on the site`}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft hover:border-brand hover:text-brand"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      act(
                        () => restrictCommunity(c.id, !c.restricted),
                        c.restricted ? undefined : `Restrict the ${c.examName} community? It disappears from the site; posts and members are kept.`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-amber-400 hover:text-amber-800"
                  >
                    {c.restricted ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {c.restricted ? "Reopen" : "Restrict"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => deleteCommunity(c.id), `Delete the ${c.examName} community with every post, reply and membership? This cannot be undone.`)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-red-400 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
