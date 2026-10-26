import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Flame, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ListingHero, introOf } from "@/components/colleges/listing-hero";
import { ListingCard } from "@/components/colleges/listing-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { ListingSlotView } from "@/components/colleges/listing-slot";
import { Reveal } from "@/components/college/reveal";
import { appliedFilters, simple, toggleHref, type FilterGroup } from "@/components/colleges/filter-utils";
import { getCollegeFacets, getColleges, getListingHeader, getCollectionMeta, getListingSlots, getNavMenuConfig, getRankings, type CollectionMeta, type ListingSlot, type CollegeFacets, type CollegeParams, type RankingList } from "@/lib/api";
import { scopeFromParams } from "@/lib/listing-scope";
import { getMenuSource, menuSeoFor } from "@/components/colleges-menu-data";
import { badgesFor, listingFaqs, listingIntro, listingTitle } from "@/components/colleges/listing-meta";
import type { RichTextDoc } from "@/lib/rich-text";

/** The filters a collection presets, as they appear in the colleges address. */
const COLLECTION_FILTER_KEYS = ["stream", "course", "specialisation", "city", "ownership", "level", "credential", "mode", "exam", "approval", "ranking_list"] as const;

/** A rich-text intro as plain paragraphs. */
function paragraphsOf(doc: RichTextDoc | undefined): string[] {
  if (!doc || !Array.isArray(doc.content)) return [];
  return doc.content
    .map((node) => {
      const block = node as { content?: { text?: string }[] };
      return (block.content ?? []).map((t) => t.text ?? "").join("");
    })
    .filter((p) => p.trim() !== "");
}

/**
 * The filter menus. Location, course, specialisation, mode, exam and approval
 * offer what the directory actually holds; the rest are fixed scales (fee
 * bands, rating steps, levels) that do not come from data.
 */
function filterGroups(f: CollegeFacets, rankingLists: RankingList[]): FilterGroup[] {
  return [
    { id: "category", label: "Category", options: simple("stream", f.streams ?? []) },
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

const NO_FACETS: CollegeFacets = { streams: [], cities: [], exams: [], approvals: [], modes: [], courses: [], specialisations: [] };

const SORTS = [
  { key: "popularity", label: "Popularity" },
  { key: "rating", label: "Top Rated" },
  { key: "views", label: "Most Viewed" },
];

const num = (v: string | undefined) =>
  v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v);

/** A link in the header menu can carry a page title and description written in Sections → Navigation. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  // A collection's own title and description, when the address says it is one.
  const collectionSlug = one("collection");
  const found = collectionSlug ? await getCollectionMeta(collectionSlug).catch(() => null) : null;
  const meta = found && (found.membership === "picked" || COLLECTION_FILTER_KEYS.some((k) => one(k))) ? found : null;
  if (meta) {
    const heading = meta.heading || meta.title;
    return {
      title: meta.seo.metaTitle || heading,
      description: meta.seo.metaDescription || meta.subheading || `Browse ${heading} on fees, placements, rankings and admissions.`,
      alternates: { canonical: meta.seo.canonical || meta.href },
    };
  }
  const scope = scopeFromParams(one);
  if (!scope) return {};
  const config = await getNavMenuConfig().catch(() => null);
  const source = await getMenuSource(config ?? undefined);
  const seo = config && menuSeoFor(config, source, `/colleges?${new URLSearchParams([[scope.slice(0, scope.indexOf("=")), scope.slice(scope.indexOf("=") + 1)]])}`);
  if (!seo) return {};
  return { ...(seo.title && { title: seo.title }), ...(seo.description && { description: seo.description }) };
}

export default async function CollegesListingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);

  // A collection dresses the page while it still means something: it is hand-picked, or at least one of
  // its filters is still applied. Remove the last filter and the page is the plain list again.
  const collectionSlug = str("collection");
  const found: CollectionMeta | null = collectionSlug ? await getCollectionMeta(collectionSlug).catch(() => null) : null;
  const collection = found && (found.membership === "picked" || COLLECTION_FILTER_KEYS.some((k) => str(k))) ? found : null;

  const page = num(str("page")) ?? 1;
  const sort = str("sort") ?? "popularity";
  const query: CollegeParams = {
    q: str("q"),
    city: str("city"),
    course: str("course"),
    specialisation: str("specialisation"),
    credential: str("credential"),
    stream: str("stream"),
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
    collection: collection ? collection.slug : undefined,
    // A header-menu link can leave some institutes out; that holds while the link's own filters are on.
    menu: collection || COLLECTION_FILTER_KEYS.some((k) => str(k)) ? str("menu") : undefined,
  };

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string") search.set(k, v);

  let colleges: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  let meta = { total: 0, page: 1, limit: 20, pages: 1 };

  // The filter menu is secondary: if its request fails the listing still renders.
  const [list, facets, header, rankingLists, slots] = await Promise.all([
    getColleges({ page, limit: 20, sort, ...query }).catch(() => null),
    getCollegeFacets().catch(() => NO_FACETS),
    getListingHeader("colleges", scopeFromParams(str)).catch(() => null),
    getRankings().catch(() => [] as RankingList[]),
    getListingSlots("colleges").catch(() => null),
  ]);
  const slotList = slots?.slots ?? [];
  const groups = filterGroups(facets, rankingLists);
  const pickedList = rankingLists.find((l) => l.slug === query.ranking_list);
  const applied = appliedFilters("/colleges", groups, search);
  if (list) {
    colleges = list.data;
    meta = list.meta;
  }

  const { title: autoTitle, filtered } = listingTitle({
    q: query.q, stream: query.stream, city: query.city, course: query.course, specialisation: query.specialisation,
    level: query.level, credential: query.credential, mode: query.mode, ownership: query.ownership,
    exam: query.exam, approval: query.approval, ranking_max: query.ranking_max, ranking_list_name: pickedList?.name, min_rating: query.min_rating,
  });
  // A heading the admin wrote applies to the page it was written for: a selection's own header on
  // that selection alone, the page's on the unfiltered page.
  const written = header?.title && (scopeFromParams(str) ? header.custom && applied.length === 1 : !filtered) ? header.title : "";
  // A collection names its own page; its heading stands while visitors narrow it further.
  const title = collection ? collection.heading || collection.title : written || autoTitle;
  const badgeOf = badgesFor(colleges);
  const badgeCounts = colleges.reduce(
    (n, c) => {
      const b = badgeOf(c);
      return { featured: n.featured + +b.featured, topRated: n.topRated + +b.topRated, mostViewed: n.mostViewed + +b.mostViewed };
    },
    { featured: 0, topRated: 0, mostViewed: 0 },
  );
  const collectionFaqs = collection?.seo.faqs ?? [];
  const faqs = [...collectionFaqs, ...listingFaqs(title, colleges, meta.total).filter((f) => !collectionFaqs.some((c) => c.question === f.question))];

  const collectionIntro = paragraphsOf(collection?.seo.intro);
  const intro = collectionIntro.length > 0 ? collectionIntro : introOf(header, listingIntro(title, colleges, meta.total));
  // The author the collection names, else the one set for the colleges page.
  const author = collection?.author.name && header ? { ...header, name: collection.author.name, role: collection.author.role, photo: collection.author.photo } : collection?.author.name ? { name: collection.author.name, role: collection.author.role, photo: collection.author.photo, intro: "", title: "" } : header;
  // The chip that ends the collection: the filters stay, its header and picked list go.
  const withoutCollection = (() => {
    const next = new URLSearchParams(search.toString());
    next.delete("collection");
    next.delete("page");
    const qs = next.toString();
    return qs ? `/colleges?${qs}` : "/colleges";
  })();

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
   * What goes between the colleges: the banners, filter strips and ads set in the admin's Banners &
   * ads. Each slot is shown after `after` colleges on the page, and again every `every` more. It is
   * never placed after the last college, so the list does not end on an advertisement.
   */
  const between = new Map<number, ListingSlot[]>();
  for (const slot of slotList) {
    if (!slot.enabled) continue;
    for (let at = slot.after; at < colleges.length; at += slot.every || colleges.length) {
      between.set(at, [...(between.get(at) ?? []), slot]);
    }
  }
  return (
    <div className="mx-auto max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8">
      <ListingHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: filtered || collection ? "/colleges" : undefined },
          ...(filtered || collection ? [{ label: title }] : []),
        ]}
        title={title}
        countLabel={`${meta.total} Results`}
        intro={intro}
        author={author}
      />
      {collection?.subheading && <p className="mt-2 text-sm text-ink-soft">{collection.subheading}</p>}

      {/* Filter bar: applied filters on the left, badge legend on the right */}
      <div className="mt-3 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 pr-2 text-sm font-medium text-ink">
            <SlidersHorizontal className="h-4 w-4 text-brand" />
            Filters
          </span>
          {collection && (
            <Link
              href={withoutCollection}
              scroll={false}
              aria-label={`Leave the ${collection.title} collection`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-brand hover:text-white"
            >
              Collection: {collection.title}
              <X className="h-3.5 w-3.5" />
            </Link>
          )}
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
          {applied.length === 0 && !collection && <span className="text-sm text-ink-faint">None applied</span>}
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

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
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
                {between.get(i + 1)?.map((slot) => (
                  <Reveal key={slot.id} amount={0.2}>
                    <ListingSlotView slot={slot} chips={slot.type === "filter" ? chipsFor(slot.group, slot.limit) : []} />
                  </Reveal>
                ))}
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
