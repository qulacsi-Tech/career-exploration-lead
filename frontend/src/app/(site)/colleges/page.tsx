import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { Eye, Flame, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ListingHero, introOf } from "@/components/colleges/listing-hero";
import { ListingCard } from "@/components/colleges/listing-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { FilterStrip, PromoBanner } from "@/components/colleges/listing-extras";
import { Reveal } from "@/components/college/reveal";
import { appliedFilters, simple, toggleHref, type FilterGroup } from "@/components/colleges/filter-utils";
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

  /** One-tap chips for a filter group: the same URLs the sidebar produces, so they keep the other filters. */
  const chipsFor = (groupId: string, limit: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];
    return group.options.slice(0, limit).map((o) => ({ label: o.label, href: toggleHref("/colleges", search, group, o) }));
  };

  /**
   * What goes between the colleges, after the Shiksha page the client pointed at: a banner or a strip
   * of filters every few rows, in a repeating order. Keyed by the row it follows, and never placed
   * after the last row, so the list does not end on an advertisement.
   */
  const between: Record<number, ReactNode> = {
    1: <PromoBanner variant="compare" />,
    4: <FilterStrip kind="location" chips={chipsFor("location", 10)} />,
    7: <PromoBanner variant="counselling" />,
    10: <FilterStrip kind="ownership" chips={chipsFor("ownership", 4)} />,
    13: <PromoBanner variant="exams" />,
    16: <FilterStrip kind="fees" chips={chipsFor("fees", 4)} />,
  };
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Popularity";
  const shownFrom = (page - 1) * 20 + 1;
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
        <ul className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-gold"><Sparkles className="h-4 w-4" aria-hidden="true" />Featured ({badgeCounts.featured})</li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-brand-ink"><Flame className="h-4 w-4" aria-hidden="true" />Top rated ({badgeCounts.topRated})</li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"><Eye className="h-4 w-4" aria-hidden="true" />Most viewed ({badgeCounts.mostViewed})</li>
        </ul>
      </div>

      {/* A line of plain-spoken context, so the page says where you are and what to do next. */}
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-ink">
        <span className="tcp-live-dot inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
        {meta.total > 0 ? (
          <>
            Showing <strong className="font-bold">{shownFrom}&ndash;{shownFrom + colleges.length - 1}</strong> of{" "}
            <strong className="font-bold">{meta.total}</strong> colleges, sorted by <strong className="font-bold">{sortLabel.toLowerCase()}</strong>.
            <span className="text-ink-soft">Hover a card, peek inside, add two to Compare. Nothing bites.</span>
          </>
        ) : (
          <>No colleges to show for these filters.</>
        )}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-brand-soft to-bg-alt px-4 py-3">
            <p className="font-display text-lg font-extrabold uppercase tracking-wide text-brand-ink">Filters</p>
            <p className="text-sm text-ink-soft">Narrow it down. We will keep the list tidy.</p>
          </div>
          <ListingFilters groups={groups} sorts={SORTS} sort={sort} />
        </aside>

        <div className="min-w-0">
          <div className="space-y-5">
            {colleges.map((college, i) => (
              <Fragment key={college.slug}>
                <Reveal amount={0.12}>
                  <ListingCard college={college} badges={badgeOf(college)} />
                </Reveal>
                {i < colleges.length - 1 && between[i] && <Reveal amount={0.2}>{between[i]}</Reveal>}
              </Fragment>
            ))}
            {colleges.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
                <SearchX className="tcp-float mx-auto h-12 w-12 text-brand/60" aria-hidden="true" />
                <p className="mt-4 font-display text-xl font-bold text-ink">Hmm, nothing here.</p>
                <p className="mx-auto mt-1 max-w-md text-base text-ink-soft">
                  Even our best detective found no colleges for those filters. Loosen one and try again?
                </p>
                <Link
                  href="/colleges"
                  className="tcp-wiggle mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Clear filters
                </Link>
              </div>
            )}
          </div>

          {/* Crawlable pagination */}
          {meta.pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2 text-base">
              <span className="mr-1 text-sm text-ink-soft">More colleges this way:</span>
              {Array.from({ length: Math.min(meta.pages, 5) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`grid h-10 min-w-10 place-items-center rounded-full border px-3 font-semibold transition hover:-translate-y-0.5 ${
                    p === page ? "border-brand bg-brand text-white shadow-sm" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < meta.pages && (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-full border border-brand px-5 py-2 font-semibold text-brand transition hover:-translate-y-0.5 hover:bg-brand hover:text-white"
                >
                  Next page &rarr;
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
