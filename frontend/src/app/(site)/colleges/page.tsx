import Link from "next/link";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingCard } from "@/components/colleges/listing-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCollegeFacets, getColleges, getExams, getLocations, type CollegeFacets, type CollegeParams, type Exam } from "@/lib/api";
import { badgesFor, listingFaqs, listingTitle } from "@/components/colleges/listing-meta";

/**
 * The filter menus. Location, course, specialisation, mode, exam and approval
 * offer what the directory actually holds; the rest are fixed scales (fee
 * bands, rating steps, levels) that do not come from data.
 */
function filterGroups(f: CollegeFacets): FilterGroup[] {
  return [
    { id: "location", label: "Location", options: simple("city", f.cities) },
    { id: "course", label: "Course", options: simple("course", f.courses) },
    { id: "specialisation", label: "Specialisation", options: simple("specialisation", f.specialisations) },
    { id: "credential", label: "Credential", options: simple("credential", ["Degree", "Diploma", "Doctorate"]) },
    { id: "level", label: "Course Level", options: simple("level", ["UG", "PG", "Doctorate"]) },
    { id: "mode", label: "Mode of Study", options: simple("mode", f.modes) },
    {
      id: "fees",
      label: "Total Fees",
      options: [
        { label: "< 5 Lakh", params: { fees_max: "5" } },
        { label: "5 - 10 Lakh", params: { fees_min: "5", fees_max: "10" } },
        { label: "10 - 20 Lakh", params: { fees_min: "10", fees_max: "20" } },
        { label: "> 20 Lakh", params: { fees_min: "20" } },
      ],
    },
    { id: "ownership", label: "Ownership", options: simple("ownership", ["Private", "Government", "Deemed"]) },
    { id: "exam", label: "Exam accepted", options: simple("exam", f.exams) },
    { id: "approval", label: "Approval", options: simple("approval", f.approvals) },
    {
      id: "ranking",
      label: "Ranking",
      options: [
        { label: "NIRF Top 25", params: { ranking_max: "25" } },
        { label: "NIRF Top 50", params: { ranking_max: "50" } },
        { label: "NIRF Top 100", params: { ranking_max: "100" } },
      ],
    },
    {
      id: "rating",
      label: "Rating",
      options: [
        { label: "4.5 & above", params: { min_rating: "4.5" } },
        { label: "4.0 & above", params: { min_rating: "4" } },
        { label: "3.5 & above", params: { min_rating: "3.5" } },
      ],
    },
  ].filter((g) => g.options.length > 0);
}

const NO_FACETS: CollegeFacets = { cities: [], exams: [], approvals: [], modes: [], courses: [], specialisations: [] };

const SORTS = [
  { key: "popularity", label: "Popularity" },
  { key: "rating", label: "Top Rated" },
  { key: "views", label: "Most Viewed" },
];

/** The budget shortcuts in the right rail: each is a fee filter plus a live count. */
const BUDGETS: { label: string; min?: number; max?: number }[] = [
  { label: "< 5 Lakh", max: 5 },
  { label: "5 - 10 Lakh", min: 5, max: 10 },
  { label: "10 - 20 Lakh", min: 10, max: 20 },
  { label: "> 20 Lakh", min: 20 },
];

const num = (v: string | undefined) =>
  v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v);

/** Exams still open for registration, soonest first. Dates are the editor's text ("20 Sep 2026"). */
function upcomingDeadlines(exams: Exam[]) {
  const now = Date.now();
  return exams
    .map((exam) => ({ exam, at: Date.parse(exam.registrationCloses) }))
    .filter((d) => !Number.isNaN(d.at) && d.at >= now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 5);
}

export default async function CollegesListingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);

  const page = num(str("page")) ?? 1;
  const sort = str("sort") ?? "popularity";
  const query: CollegeParams = {
    q: str("q"),
    city: str("city"),
    course: str("course"),
    specialisation: str("specialisation"),
    credential: str("credential"),
    level: str("level"),
    mode: str("mode"),
    ownership: str("ownership"),
    exam: str("exam"),
    approval: str("approval"),
    ranking_max: num(str("ranking_max")),
    fees_min: num(str("fees_min")),
    fees_max: num(str("fees_max")),
    min_rating: num(str("min_rating")),
  };

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") search.set(k, v);

  let colleges: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  let meta = { total: 0, page: 1, limit: 20, pages: 1 };

  // The rail is secondary: if any of its requests fail the listing still renders.
  const [list, budgetCounts, locations, exams, facets] = await Promise.all([
    getColleges({ page, limit: 20, sort, ...query }).catch(() => null),
    Promise.all(
      BUDGETS.map((b) =>
        getColleges({ limit: 1, fees_min: b.min, fees_max: b.max })
          .then((r) => r.meta.total)
          .catch(() => null),
      ),
    ),
    getLocations().catch(() => []),
    getExams({ limit: 50 })
      .then((r) => r.data)
      .catch(() => []),
    getCollegeFacets().catch(() => NO_FACETS),
  ]);
  const groups = filterGroups(facets);
  const applied = appliedFilters("/colleges", groups, search);
  if (list) {
    colleges = list.data;
    meta = list.meta;
  }

  const { title, filtered } = listingTitle({
    q: query.q, city: query.city, course: query.course, specialisation: query.specialisation,
    level: query.level, credential: query.credential, mode: query.mode, ownership: query.ownership,
    exam: query.exam, approval: query.approval, ranking_max: query.ranking_max, min_rating: query.min_rating,
  });
  const badgeOf = badgesFor(colleges);
  const badgeCounts = colleges.reduce(
    (n, c) => {
      const b = badgeOf(c);
      return { featured: n.featured + +b.featured, topRated: n.topRated + +b.topRated, mostViewed: n.mostViewed + +b.mostViewed };
    },
    { featured: 0, topRated: 0, mostViewed: 0 },
  );
  const faqs = listingFaqs(title, colleges, meta.total);

  const topLocations = [...locations].sort((a, b) => b.collegeCount - a.collegeCount).slice(0, 5);
  const deadlines = upcomingDeadlines(exams);

  const pageHref = (p: number) => {
    const next = new URLSearchParams(search.toString());
    next.set("page", String(p));
    return `?${next.toString()}`;
  };
  const budgetHref = (b: (typeof BUDGETS)[number]) => {
    const next = new URLSearchParams();
    if (b.min !== undefined) next.set("fees_min", String(b.min));
    if (b.max !== undefined) next.set("fees_max", String(b.max));
    return `/colleges?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: filtered ? "/colleges" : undefined },
          ...(filtered ? [{ label: title }] : []),
        ]}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{meta.total} Results</p>
        </div>
        <Link
          href="/enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
        </Link>
      </div>

      {/* Filter bar: applied filters on the left, badge legend on the right */}
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
            <Link href="/colleges" className="text-sm font-medium text-brand hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-1.5"><Cog className="h-4 w-4 text-amber-500" />Featured ({badgeCounts.featured})</li>
          <li className="inline-flex items-center gap-1.5"><Cog className="h-4 w-4 text-brand" />Top Rated ({badgeCounts.topRated})</li>
          <li className="inline-flex items-center gap-1.5"><Cog className="h-4 w-4 text-emerald-600" />Most Viewed ({badgeCounts.mostViewed})</li>
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0">
          <div className="space-y-4">
            {colleges.map((college) => (
              <ListingCard key={college.slug} college={college} badges={badgeOf(college)} />
            ))}
            {colleges.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
                <p className="text-sm text-ink-soft">No colleges match these filters.</p>
                <Link href="/colleges" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                  Clear filters
                </Link>
              </div>
            )}
          </div>

          {/* Crawlable pagination */}
          {meta.pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: Math.min(meta.pages, 5) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`rounded-full border px-3 py-1.5 ${
                    p === page ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < meta.pages && (
                <Link href={pageHref(page + 1)} className="rounded-full border border-line px-3 py-1.5 text-ink-soft hover:border-brand">
                  Next &rarr;
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right rail: tinted cards */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">View colleges in budget of</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {BUDGETS.map((b, i) => (
                <Link
                  key={b.label}
                  href={budgetHref(b)}
                  className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-ink transition hover:bg-white hover:shadow-sm"
                >
                  {b.label}
                  {budgetCounts[i] !== null && <span className="ml-1 text-brand">({budgetCounts[i]})</span>}
                </Link>
              ))}
            </div>
          </div>

          {deadlines.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Entrance exams</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Upcoming Admission Deadlines</p>
              <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
                {deadlines.map(({ exam }) => (
                  <li key={exam.slug} className="flex justify-between gap-3">
                    <Link href={`/exams/${exam.slug}`} className="min-w-0 truncate hover:text-brand">
                      {exam.name}
                    </Link>
                    <span className="shrink-0 font-medium">{exam.registrationCloses}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topLocations.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="font-display text-lg font-semibold text-brand-ink">Most Preferred Locations</p>
              <ul className="mt-4 space-y-2.5 text-sm text-brand-ink/80">
                {topLocations.map((l) => (
                  <li key={l.slug} className="flex justify-between gap-3">
                    <Link href={`/location/${l.slug}`} className="hover:text-brand">{l.name}</Link>
                    <span className="font-medium">{l.collegeCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* FAQs, answered from the colleges listed above */}
      {faqs.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink">FAQs</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-line bg-surface px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                  {faq.question}
                  <span className="text-ink-faint transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-sm text-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
