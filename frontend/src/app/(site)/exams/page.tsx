import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, ClipboardList, Flame, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExamCard } from "@/components/colleges/exam-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getExamPracticeCounts, getExams, getPracticeTests, type Exam } from "@/lib/api";
import { compactCount, daysUntil, examShortName } from "@/lib/exam-insights";
import { examBadgeTone } from "@/components/exam-status-badge";
import { ExamInfoPanel } from "@/components/exams/info-panel";
import { ActionButton } from "@/components/college/college-actions";
import { examKey } from "@/lib/entity-url";
import { getCommunities } from "@/lib/community-api";

export const metadata: Metadata = {
  title: "Entrance Exams: Dates, Registration & Cutoffs",
  description:
    "Entrance exam calendar with conducting bodies, registration deadlines and exam dates for national and state-level tests.",
};

const SORTS = [
  { key: "deadline", label: "Registration deadline" },
  { key: "date", label: "Exam date" },
  { key: "name", label: "Name (A–Z)" },
];

const distinct = (values: (string | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort();

/** The editor's date text ("26 Mar 2027", "May 2027") as a time; unparseable sorts last. */
const when = (text: string) => {
  const t = Date.parse(text);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

function sortExams(list: Exam[], sort: string) {
  const out = [...list];
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "date") out.sort((a, b) => when(a.examDate) - when(b.examDate));
  else out.sort((a, b) => when(a.registrationCloses) - when(b.registrationCloses));
  return out;
}

/** When the page is read: the listing is rendered per request, so this is the visitor's moment. */
const pageTime = () => Date.now();

/** Exams whose registration is still open, soonest first. */
function openDeadlines(exams: Exam[]) {
  const now = Date.now();
  return exams
    .filter((e) => when(e.registrationCloses) >= now && when(e.registrationCloses) !== Number.POSITIVE_INFINITY)
    .sort((a, b) => when(a.registrationCloses) - when(b.registrationCloses))
    .slice(0, 5);
}

/**
 * The exam calendar, laid out like the college and course listings. The
 * directory is small (one API page covers it), so facets are read from the data
 * and applied here.
 */
export default async function ExamsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };

  // The exams, their practice tests and how many students practised for each, read together.
  const [all, tests, practised, communities] = await Promise.all([
    getExams({ limit: 100 }).then((r) => r.data).catch((): Exam[] => []),
    getPracticeTests().catch(() => []),
    getExamPracticeCounts(),
    getCommunities(),
  ]);
  const communityByExam = Object.fromEntries(communities.map((c) => [c.examSlug, c]));
  const testsByExam = tests.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.examSlug]: (acc[t.examSlug] ?? 0) + 1 }), {});
  const now = pageTime();

  const groups: FilterGroup[] = [
    { id: "stream", label: "Stream", options: simple("stream", distinct(all.map((e) => e.stream))) },
    { id: "level", label: "Exam Level", options: simple("level", distinct(all.map((e) => e.level))) },
    { id: "mode", label: "Mode of Exam", options: simple("mode", distinct(all.map((e) => e.mode))) },
    { id: "status", label: "Status", options: simple("status", distinct(all.map((e) => e.statusLabel))) },
  ];

  const stream = str("stream");
  const level = str("level");
  const mode = str("mode");
  const status = str("status");
  const sort = str("sort") ?? "deadline";

  const q = str("q")?.slice(0, 100);
  const needle = q?.toLowerCase();
  const exams = sortExams(
    all.filter(
      (e) =>
        (!stream || e.stream === stream) &&
        (!level || e.level === level) &&
        (!mode || e.mode === mode) &&
        (!status || e.statusLabel === status) &&
        (!needle || `${e.name} ${e.shortName ?? ""} ${e.conductingBody} ${e.stream ?? ""}`.toLowerCase().includes(needle)),
    ),
    sort,
  );

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) search.set(k, val);
  }
  const applied = appliedFilters("/exams", groups, search);

  const streamCounts = distinct(all.map((e) => e.stream)).map((name) => ({
    name,
    count: all.filter((e) => e.stream === name).length,
  }));
  const deadlines = openDeadlines(all);
  const statusCounts = distinct(all.map((e) => e.statusLabel)).map(
    (status) => [status, all.filter((e) => e.statusLabel === status).length] as const,
  );
  // The headline numbers over the list.
  const closingSoon = all.filter((e) => {
    const d = daysUntil(e.registrationCloses, now);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const studentsPractised = Object.values(practised).reduce((n, c) => n + c.students, 0);
  const DOT = { live: "bg-emerald-500", upcoming: "bg-amber-500", expired: "bg-slate-400", custom: "bg-ink" } as const;

  return (
    <div className="mx-auto max-w-[88rem] px-5 py-6 sm:px-8 lg:px-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: stream ? "/exams" : undefined },
          ...(stream ? [{ label: stream }] : []),
        ]}
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {stream ? `${stream} Entrance Exams` : "Entrance Exams"}
          </h1>
          <p className="mt-1 text-sm italic text-brand-ink/80">Every date, deadline and mock test in one place. No more tab-hopping.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* A plain GET form: the search joins the other filters in the address. */}
          <form action="/exams" method="get" role="search" className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
            {Object.entries(params).map(([k, v]) => {
              const val = Array.isArray(v) ? v[0] : v;
              return k !== "q" && val ? <input key={k} type="hidden" name={k} value={val} /> : null;
            })}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              maxLength={100}
              placeholder="Search exams: CAT, NEET, IIM…"
              aria-label="Search exams"
              className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink shadow-sm placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </form>
          <ActionButton kind="callback"
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
          >
            Get Exam Alerts
          </ActionButton>
        </div>
      </div>

      {/* The numbers worth a glance, big. */}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: ClipboardList, label: exams.length !== all.length ? `of ${all.length} exams shown` : "Exams to explore", value: exams.length },
          { icon: Flame, label: "Closing in 30 days", value: closingSoon, hot: closingSoon > 0 },
          { icon: CalendarClock, label: "Mock tests ready", value: tests.length },
          { icon: Users, label: "Students practising", value: studentsPractised },
        ].map(({ icon: Icon, label, value, hot }) => (
          <div key={label} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${hot ? "bg-red-50 text-red-600" : "bg-brand-soft text-brand"}`}>
              <Icon className="h-5 w-5 transition group-hover:scale-110" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dd className="bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display text-3xl font-extrabold leading-none text-transparent">{compactCount(value)}</dd>
              <dt className="mt-1 truncate text-xs font-semibold text-ink-soft">{label}</dt>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 pr-2 text-sm font-medium text-ink">
            <SlidersHorizontal className="h-4 w-4 text-brand" />
            Filters
          </span>
          {applied.map((f) => (
            <Link
              key={f.id}
              href={f.clear}
              scroll={false}
              aria-label={`Remove filter ${f.label}`}
              className="inline-flex items-center gap-2 rounded-lg bg-bg-alt px-3 py-1.5 text-sm text-ink-soft transition hover:bg-brand-soft hover:text-brand-ink"
            >
              {f.label}
              <X className="h-3.5 w-3.5" />
            </Link>
          ))}
          {q && (
            <Link
              href={(() => {
                const rest = new URLSearchParams(search);
                rest.delete("q");
                return rest.toString() ? `/exams?${rest}` : "/exams";
              })()}
              scroll={false}
              aria-label={`Remove search ${q}`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand-soft/70"
            >
              &ldquo;{q}&rdquo;
              <X className="h-3.5 w-3.5" />
            </Link>
          )}
          {applied.length === 0 && !q && <span className="text-sm text-ink-faint">None applied</span>}
          {applied.length > 1 && (
            <Link href="/exams" className="text-sm font-medium text-brand hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          {statusCounts.map(([name, n]) => (
            <li key={name}>
              <Link
                href={`/exams?status=${encodeURIComponent(name)}`}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 transition hover:bg-brand-soft hover:text-brand-ink"
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[examBadgeTone(name)]}`} />
                {name} <span className="font-display font-extrabold text-ink">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <ExamInfoPanel count={deadlines.filter((e) => (daysUntil(e.registrationCloses, now) ?? 99) <= 30).length}>
          {deadlines.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-xs font-semibold text-brand">Closing soon</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Upcoming Deadlines</p>
              <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
                {deadlines.map((e) => {
                  const d = daysUntil(e.registrationCloses, now) ?? 0;
                  return (
                    <li key={e.slug} className="flex items-center justify-between gap-3">
                      <Link href={`/exams/${examKey(e)}`} className="min-w-0 truncate font-medium text-brand-ink hover:text-brand" title={e.name}>
                        {examShortName(e)}
                      </Link>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${d <= 7 ? "bg-red-600 text-white" : "bg-white text-brand"}`} title={e.registrationCloses}>
                        {d === 0 ? "Today" : `${d}d left`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Browse by stream</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {streamCounts.map((s) => (
                <Link
                  key={s.name}
                  href={`/exams?stream=${encodeURIComponent(s.name)}`}
                  className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-ink transition hover:bg-white hover:shadow-sm"
                >
                  {s.name}
                  <span className="ml-1 text-brand">({s.count})</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Never miss a date</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Get registration and result alerts for the exams you are targeting.
            </p>
            <ActionButton kind="callback"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Get Exam Alerts
            </ActionButton>
          </div>
        </ExamInfoPanel>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0 space-y-4">
          {exams.map((exam) => (
            <ExamCard key={exam.slug} exam={exam} tests={testsByExam[exam.slug] ?? 0} students={practised[exam.slug]?.students ?? 0} now={now} community={communityByExam[exam.slug]} />
          ))}
          {exams.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
              <p className="text-sm text-ink-soft">
                {all.length === 0 ? "No exams found." : "No exams match these filters."}
              </p>
              <Link href="/exams" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                {all.length === 0 ? "Refresh" : "Clear filters"}
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
