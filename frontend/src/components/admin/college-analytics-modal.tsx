"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, HelpCircle, Inbox, Loader2, Star, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { loadCollegeAnalytics } from "@/lib/admin-actions";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LEAD_TYPE_LABEL, formatFull } from "@/lib/lead-labels";
import type { CollegeAnalytics, LeadStatus } from "@/lib/api";

type Tab = "overview" | "leads" | "questions" | "reviews";

/**
 * Everything about one college in one dialog, opened from the Analytics button on the college list: how many
 * people looked at it, the leads that came to it (enquiries, counselling requests, callbacks, brochure
 * downloads), the questions students asked and the reviews they wrote. The overview shows the numbers and what
 * needs attention; the other tabs list the newest of each.
 */
export function CollegeAnalyticsModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const [data, setData] = useState<CollegeAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let alive = true;
    loadCollegeAnalytics(slug).then((result) => {
      if (!alive) return;
      if ("error" in result) setError(result.error);
      else setData(result);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const s = data?.summary;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "leads", label: "Leads", count: s?.leads },
    { key: "questions", label: "Q&A", count: s?.questions },
    { key: "reviews", label: "Reviews", count: s?.reviews },
  ];

  return (
    <AdminModal open onClose={onClose} size="lg" title={`${name}: analytics`} description="Visits, leads, questions and reviews for this college.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5 border-b border-line pb-3" role="tablist" aria-label="Analytics sections">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.key ? "bg-brand text-white" : "text-ink-soft hover:bg-bg-alt hover:text-brand"}`}
            >
              {t.label}
              {t.count !== undefined && <span className={`ml-1.5 text-xs ${tab === t.key ? "text-white/80" : "text-ink-faint"}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!data && !error && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        )}

        {data && tab === "overview" && <Overview data={data} go={setTab} />}
        {data && tab === "leads" && <Leads data={data} />}
        {data && tab === "questions" && <Questions data={data} />}
        {data && tab === "reviews" && <Reviews data={data} />}
      </div>
    </AdminModal>
  );
}

/* ------------------------------------------------------------------ *
   Overview
 * ------------------------------------------------------------------ */

function Stat({ icon: Icon, label, value, note, alert, onClick }: { icon: LucideIcon; label: string; value: string | number; note?: string; alert?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand hover:shadow-sm">
      <span className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-[18px] w-[18px]" /></span>
        {alert && <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-label="Needs attention" />}
      </span>
      <span className="mt-3 block font-display text-3xl font-extrabold leading-none text-ink">{value}</span>
      <span className="mt-1 block text-sm font-semibold text-ink-soft">{label}</span>
      {note && <span className="mt-0.5 block text-xs text-ink-faint">{note}</span>}
    </button>
  );
}

function Overview({ data, go }: { data: CollegeAnalytics; go: (tab: Tab) => void }) {
  const s = data.summary;
  const top = Math.max(1, ...data.daily.map((d) => d.views));
  const attention = [
    s.leadsNew > 0 && { tab: "leads" as Tab, text: `${s.leadsNew} new ${s.leadsNew === 1 ? "lead" : "leads"} waiting for a call` },
    s.questionsWaiting > 0 && { tab: "questions" as Tab, text: `${s.questionsWaiting} ${s.questionsWaiting === 1 ? "question" : "questions"} waiting for an answer` },
    s.reviewsPending > 0 && { tab: "reviews" as Tab, text: `${s.reviewsPending} ${s.reviewsPending === 1 ? "review" : "reviews"} waiting for approval` },
  ].filter(Boolean) as { tab: Tab; text: string }[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Eye} label="Page views" value={s.views30} note={`${s.visitors30} visitors, last 30 days`} onClick={() => undefined} />
        <Stat icon={Inbox} label="Leads" value={s.leads} note={`${s.leads30} in the last 30 days`} alert={s.leadsNew > 0} onClick={() => go("leads")} />
        <Stat icon={HelpCircle} label="Questions" value={s.questions} note={`${s.questionsShown} on the Q&A page`} alert={s.questionsWaiting > 0} onClick={() => go("questions")} />
        <Stat icon={Star} label="Reviews" value={s.reviews} note={s.rating !== null ? `${s.rating} average rating` : "No approved reviews yet"} alert={s.reviewsPending > 0} onClick={() => go("reviews")} />
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="text-sm font-semibold text-ink">Page views, last 14 days</p>
        <div className="mt-3 flex h-24 items-end gap-1.5" role="img" aria-label="Page views per day">
          {data.daily.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t-md bg-brand/70 transition group-hover:bg-brand" style={{ height: `${Math.max(d.views > 0 ? 8 : 3, (d.views / top) * 100)}%` }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-[11px] text-white group-hover:block">
                {d.views} on {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">Needs attention</p>
        {attention.length === 0 ? (
          <p className="mt-2 rounded-xl bg-bg-alt px-4 py-3 text-sm text-ink-soft">Nothing is waiting. You are all caught up.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {attention.map((a) => (
              <li key={a.text}>
                <button type="button" onClick={() => go(a.tab)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand-soft/50 px-4 py-3 text-left text-sm font-medium text-brand-ink transition hover:bg-brand-soft">
                  {a.text}
                  <span aria-hidden>→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Lists
 * ------------------------------------------------------------------ */

const Empty = ({ children }: { children: string }) => <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">{children}</p>;

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "good" | "wait" | "brand" }) {
  const styles = { plain: "bg-bg-alt text-ink-soft", good: "bg-emerald-50 text-emerald-800", wait: "bg-amber-100 text-amber-900", brand: "bg-brand-soft text-brand-ink" }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{children}</span>;
}

function Leads({ data }: { data: CollegeAnalytics }) {
  const [type, setType] = useState("all");
  const types = ["all", ...Array.from(new Set(data.leads.map((l) => l.type)))];
  const rows = data.leads.filter((l) => type === "all" || l.type === type);

  if (data.leads.length === 0) return <Empty>No leads for this college yet.</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${type === t ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}>
              {t === "all" ? "All" : (LEAD_TYPE_LABEL[t] ?? t)}
            </button>
          ))}
        </div>
        <Link href="/admin/leads" className="text-xs font-semibold text-brand hover:underline">Open the full leads inbox →</Link>
      </div>
      <ul className="space-y-2.5">
        {rows.map((l) => (
          <li key={l.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{l.name}</p>
                <p className="text-xs text-ink-soft">
                  {l.phone}
                  {l.email ? ` · ${l.email}` : ""}
                  {l.city ? ` · ${l.city}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone="brand">{LEAD_TYPE_LABEL[l.type] ?? l.type}</Chip>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${LEAD_STATUS_STYLE[l.status as LeadStatus] ?? ""}`}>{LEAD_STATUS_LABEL[l.status as LeadStatus] ?? l.status}</span>
              </div>
            </div>
            {(l.programName || l.message) && <p className="mt-2 text-sm text-ink-soft">{l.programName && <strong className="text-ink">{l.programName}. </strong>}{l.message}</p>}
            <p className="mt-2 text-xs text-ink-faint">
              {formatFull(l.createdAt)}
              {l.repeats > 0 ? ` · asked again ${l.repeats} ${l.repeats === 1 ? "time" : "times"}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Questions({ data }: { data: CollegeAnalytics }) {
  if (data.questions.length === 0) return <Empty>No questions for this college yet.</Empty>;
  return (
    <div className="space-y-3">
      <div className="text-right"><Link href="/admin/questions" className="text-xs font-semibold text-brand hover:underline">Answer questions →</Link></div>
      <ul className="space-y-2.5">
        {data.questions.map((q) => (
          <li key={q.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs text-ink-soft">{q.kind === "concern" ? "Concern" : "Question"} from <strong className="text-ink">{q.askedBy}</strong> · {formatFull(q.createdAt)}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {q.helpful > 0 && <Chip><ThumbsUp className="h-3 w-3" /> {q.helpful}</Chip>}
                {q.published && <Chip tone="brand">On Q&amp;A page</Chip>}
                {q.answer ? <Chip tone="good">Answered by {q.answeredBy}</Chip> : <Chip tone="wait">Waiting</Chip>}
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-ink">{q.question}</p>
            {q.answer && <p className="mt-2 rounded-lg bg-bg-alt px-3 py-2 text-sm text-ink-soft">{q.answer}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Reviews({ data }: { data: CollegeAnalytics }) {
  if (data.reviews.length === 0) return <Empty>No reviews for this college yet.</Empty>;
  return (
    <ul className="space-y-2.5">
      {data.reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{r.author}</p>
              <p className="text-xs text-ink-soft">{r.course} · batch {r.batch} · {formatFull(r.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip><Star className="h-3 w-3 fill-gold text-gold" /> {r.rating.toFixed(1)}</Chip>
              <Chip><ThumbsUp className="h-3 w-3" /> {r.likes}</Chip>
              <Chip><ThumbsDown className="h-3 w-3" /> {r.dislikes}</Chip>
              {r.approved ? <Chip tone="good">Live</Chip> : <Chip tone="wait">Waiting for approval</Chip>}
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{r.body}</p>
        </li>
      ))}
      <li className="pt-1 text-right text-xs text-ink-faint">Approve or reject reviews on the college&apos;s Reviews tab in Edit.</li>
    </ul>
  );
}
