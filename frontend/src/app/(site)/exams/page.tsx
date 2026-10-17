import Link from "next/link";
import type { Metadata } from "next";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExamCard } from "@/components/colleges/exam-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getExams, type Exam } from "@/lib/api";

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

  let all: Exam[] = [];
  try {
    all = (await getExams({ limit: 100 })).data;
  } catch {
    all = [];
  }

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

  const exams = sortExams(
    all.filter(
      (e) =>
        (!stream || e.stream === stream) &&
        (!level || e.level === level) &&
        (!mode || e.mode === mode) &&
        (!status || e.statusLabel === status),
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: stream ? "/exams" : undefined },
          ...(stream ? [{ label: stream }] : []),
        ]}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {stream ? `${stream} Entrance Exams` : "Entrance Exams"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {exams.length} {exams.length === 1 ? "exam" : "exams"}
            {exams.length !== all.length && ` of ${all.length}`} &middot; registration windows and dates for the
            current cycle
          </p>
        </div>
        <Link
          href="/enquiry" data-track="cta_enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Exam Alerts
        </Link>
      </div>

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
          {applied.length === 0 && <span className="text-sm text-ink-faint">None applied</span>}
          {applied.length > 1 && (
            <Link href="/exams" className="text-sm font-medium text-brand hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          {statusCounts.map(([name, n]) => (
            <li key={name} className="inline-flex items-center gap-1.5">
              <Cog className="h-4 w-4 text-brand" />
              {name} ({n})
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0 space-y-4">
          {exams.map((exam) => (
            <ExamCard key={exam.slug} exam={exam} />
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

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {deadlines.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Closing soon</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Upcoming Deadlines</p>
              <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
                {deadlines.map((e) => (
                  <li key={e.slug} className="flex justify-between gap-3">
                    <Link href={`/exams/${e.slug}`} className="min-w-0 truncate hover:text-brand">
                      {e.name.replace(/\s*\(.*\)\s*/, "").trim()}
                    </Link>
                    <span className="shrink-0 font-medium">{e.registrationCloses}</span>
                  </li>
                ))}
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
            <Link
              href="/enquiry" data-track="cta_enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Get Exam Alerts
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
