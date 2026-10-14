import Link from "next/link";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { ListingHero, introOf } from "@/components/colleges/listing-hero";
import { ListingCard } from "@/components/colleges/listing-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCollegeFacets, getColleges, getListingHeader, getRankings, type CollegeFacets, type CollegeParams, type RankingList } from "@/lib/api";
import { badgesFor, listingFaqs, listingIntro, listingTitle } from "@/components/colleges/listing-meta";

/**
 * The filter menus. Location, course, specialisation, mode, exam and approval
 * offer what the directory actually holds; the rest are fixed scales (fee
 * bands, rating steps, levels) that do not come from data.
 */
function filterGroups(f: CollegeFacets, rankingLists: RankingList[]): FilterGroup[] {
  return [
    { id: "location", label: "Location", options: simple("city", f.cities) },
    // One option for every ranking list on the Rankings page: picking one shows the colleges in it, best rank first.
    {
      id: "ranking",
      label: "Ranking",
      options: rankingLists.map((l) => ({
        label: l.name.includes(String(l.year)) ? l.name : `${l.name} ${l.year}`,
        params: { ranking_list: l.slug },
      })),
    },
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
  ].filter((g) => g.options.length > 0);
}

const NO_FACETS: CollegeFacets = { cities: [], exams: [], approvals: [], modes: [], courses: [], specialisations: [] };

const SORTS = [
  { key: "popularity", label: "Popularity" },
  { key: "rating", label: "Top Rated" },
  { key: "views", label: "Most Viewed" },
];

const num = (v: string | undefined) =>
  v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v);

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
    ranking_list: str("ranking_list"),
    fees_min: num(str("fees_min")),
    fees_max: num(str("fees_max")),
    min_rating: num(str("min_rating")),
  };

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") search.set(k, v);

  let colleges: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  let meta = { total: 0, page: 1, limit: 20, pages: 1 };

  // The filter menu is secondary: if its request fails the listing still renders.
  const [list, facets, header, rankingLists] = await Promise.all([
    getColleges({ page, limit: 20, sort, ...query }).catch(() => null),
    getCollegeFacets().catch(() => NO_FACETS),
    getListingHeader("colleges").catch(() => null),
    getRankings().catch(() => [] as RankingList[]),
  ]);
  const groups = filterGroups(facets, rankingLists);
  const pickedList = rankingLists.find((l) => l.slug === query.ranking_list);
  const applied = appliedFilters("/colleges", groups, search);
  if (list) {
    colleges = list.data;
    meta = list.meta;
  }

  const { title, filtered } = listingTitle({
    q: query.q, city: query.city, course: query.course, specialisation: query.specialisation,
    level: query.level, credential: query.credential, mode: query.mode, ownership: query.ownership,
    exam: query.exam, approval: query.approval, ranking_max: query.ranking_max, ranking_list_name: pickedList?.name, min_rating: query.min_rating,
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

  const intro = introOf(header, listingIntro(title, colleges, meta.total));

  const pageHref = (p: number) => {
    const next = new URLSearchParams(search.toString());
    next.set("page", String(p));
    return `?${next.toString()}`;
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ListingHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: filtered ? "/colleges" : undefined },
          ...(filtered ? [{ label: title }] : []),
        ]}
        title={title}
        countLabel={`${meta.total} Results`}
        intro={intro}
        author={header}
      />

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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
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
