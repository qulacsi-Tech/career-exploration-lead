import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { CollegeThread, NewThreadForm, PlatformThread } from "@/components/messages/bound-threads";
import {
  adminGetThread,
  adminListThreads,
  collegeGetThread,
  collegeListThreads,
  getMe,
  type PaginationMeta,
  type ThreadDetail,
  type ThreadSummary,
} from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";
import { isCollegeAdmin } from "@/lib/roles";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const STATUSES = [
  { value: "open", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
] as const;

/*
  Messages between a college admin and the platform team, one page for both.

  The platform team sees a shared inbox of every college's conversations. A message from a college
  tells every admin; whoever replies first resolves it for everyone. A college admin sees only their
  own college's conversations and can start new ones.
*/
export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const params = await searchParams;
  const selected = first(params.thread);
  const startNew = first(params.new) === "1";
  const aboutRequest = first(params.request);
  const rawStatus = first(params.status);
  const status = rawStatus === "resolved" || rawStatus === "all" ? rawStatus : "open";
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const view = await withAdminToken(async (token) => {
    const me = await getMe(token);
    if (isCollegeAdmin(me.role)) {
      const threads = await collegeListThreads(token);
      const thread = selected ? await collegeGetThread(token, selected).catch(() => null) : null;
      return { college: true as const, threads, meta: null as PaginationMeta | null, thread };
    }
    const list = await adminListThreads(token, { status, page, limit: 25 });
    const thread = selected ? await adminGetThread(token, selected).catch(() => null) : null;
    return { college: false as const, threads: list.data, meta: list.meta, thread };
  });

  const href = (extra: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (!view.college && status !== "open") qs.set("status", status);
    for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
    return qs.size ? `/admin/messages?${qs}` : "/admin/messages";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Messages"
        description={
          view.college
            ? "Write to the TopCollegePath team about your college or one of your requests."
            : "Conversations with college admins. A reply resolves it for the whole team."
        }
        actions={
          view.college && (
            <Link href="/admin/messages?new=1" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
              New message
            </Link>
          )
        }
      />

      {!view.college && (
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Link
              key={s.value}
              href={s.value === "open" ? "/admin/messages" : `/admin/messages?status=${s.value}`}
              aria-current={s.value === status ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                s.value === status ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <ThreadList threads={view.threads} selected={selected} showCollege={!view.college} href={href} />

        <div className="min-w-0">
          {view.college && startNew ? (
            <NewThreadForm changeRequestId={aboutRequest} defaultSubject={aboutRequest ? "About my change request" : ""} />
          ) : view.thread ? (
            view.college ? <CollegeThread thread={view.thread as ThreadDetail} /> : <PlatformThread thread={view.thread as ThreadDetail} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-ink-soft">
              {view.threads.length === 0 ? "No conversations yet." : "Choose a conversation on the left."}
            </p>
          )}
        </div>
      </div>

      {view.meta && view.meta.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm text-ink-soft">
          {view.meta.page > 1 ? (
            <Link href={`${href({})}${href({}).includes("?") ? "&" : "?"}page=${view.meta.page - 1}`} className="font-medium text-brand hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {view.meta.page} of {view.meta.pages}
          </span>
          {view.meta.page < view.meta.pages ? (
            <Link href={`${href({})}${href({}).includes("?") ? "&" : "?"}page=${view.meta.page + 1}`} className="font-medium text-brand hover:underline">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function ThreadList({
  threads,
  selected,
  showCollege,
  href,
}: {
  threads: ThreadSummary[];
  selected: string | undefined;
  showCollege: boolean;
  href: (extra: Record<string, string | undefined>) => string;
}) {
  if (threads.length === 0) return <p className="text-sm text-ink-soft">Nothing here.</p>;
  return (
    <ul className="space-y-2">
      {threads.map((t) => (
        <li key={t.id}>
          <Link
            href={href({ thread: t.id })}
            aria-current={t.id === selected ? "true" : undefined}
            className={`block rounded-xl border px-4 py-3 transition ${
              t.id === selected ? "border-brand bg-brand-soft/50" : "border-line bg-surface hover:border-brand/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-ink">{t.subject}</p>
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
                  t.status === "open" ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg-alt text-ink-faint"
                }`}
              >
                {t.status === "open" ? "Waiting" : "Resolved"}
              </span>
            </div>
            {showCollege && t.collegeName && <p className="mt-0.5 truncate text-xs text-ink-soft">{t.collegeName}</p>}
            {t.last && (
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                {t.last.sender}: {t.last.body}
              </p>
            )}
            <p className="mt-1 text-[11px] text-ink-faint">{formatFull(t.updatedAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
