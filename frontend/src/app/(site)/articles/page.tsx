import Link from "next/link";
import type { Metadata } from "next";
import { Cog, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NewsCard } from "@/components/colleges/news-card";
import { ListingFilters } from "@/components/colleges/listing-filters";
import { appliedFilters, simple, type FilterGroup } from "@/components/colleges/filter-utils";
import { getArticles, type Article } from "@/lib/api";

export const metadata: Metadata = {
  title: "News & Admission Guides",
  description:
    "Admission processes, placement reports and course guides for colleges and entrance exams across India.",
};

const SORTS = [
  { key: "latest", label: "Latest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "quick", label: "Quickest read" },
];

const distinct = (values: (string | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort();

/** The editor's date text ("7 Oct 2026") as a time; unparseable sorts as oldest. */
const when = (text: string) => {
  const t = Date.parse(text);
  return Number.isNaN(t) ? 0 : t;
};

function sortArticles(list: Article[], sort: string) {
  const out = [...list];
  if (sort === "oldest") out.sort((a, b) => when(a.date) - when(b.date));
  else if (sort === "quick") out.sort((a, b) => (a.readMinutes ?? 99) - (b.readMinutes ?? 99));
  else out.sort((a, b) => when(b.date) - when(a.date));
  return out;
}

/**
 * The news listing, laid out like the college, course and exam listings. The
 * set of stories is small (one API page covers it), so the category filter is
 * read from the data and applied here.
 */
export default async function ArticlesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const str = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };

  let all: Article[] = [];
  try {
    all = (await getArticles({ limit: 50 })).data;
  } catch {
    all = [];
  }

  const groups: FilterGroup[] = [
    { id: "category", label: "Category", options: simple("category", distinct(all.map((a) => a.category))) },
    { id: "author", label: "Author", options: simple("author", distinct(all.map((a) => a.author))) },
  ].filter((g) => g.options.length > 0);

  const category = str("category");
  const author = str("author");
  const sort = str("sort") ?? "latest";

  const articles = sortArticles(
    all.filter((a) => (!category || a.category === category) && (!author || a.author === author)),
    sort,
  );

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) search.set(k, val);
  }
  const applied = appliedFilters("/articles", groups, search);

  const categoryCounts = distinct(all.map((a) => a.category)).map(
    (name) => [name, all.filter((a) => a.category === name).length] as const,
  );
  const latest = sortArticles(all, "latest").slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "News", href: category ? "/articles" : undefined },
          ...(category ? [{ label: category }] : []),
        ]}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {category ? `${category} News` : "News & Admission Guides"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {articles.length} {articles.length === 1 ? "story" : "stories"}
            {articles.length !== all.length && ` of ${all.length}`} &middot; admission processes, placement reports
            and course guides
          </p>
        </div>
        <Link
          href="/enquiry" data-track="cta_enquiry"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Get Free Counselling
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
            <Link href="/articles" className="text-sm font-medium text-brand hover:underline">
              Clear all
            </Link>
          )}
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          {categoryCounts.map(([name, n]) => (
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
          {articles.map((article, i) => (
            <NewsCard key={article.slug} article={article} lead={i === 0 && sort === "latest" && !category && !author} />
          ))}
          {articles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-alt px-6 py-14 text-center">
              <p className="text-sm text-ink-soft">
                {all.length === 0 ? "No stories yet." : "No stories match these filters."}
              </p>
              {all.length > 0 && (
                <Link href="/articles" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                  Clear filters
                </Link>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {categoryCounts.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="font-display text-lg font-semibold text-brand-ink">Browse by category</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryCounts.map(([name, n]) => (
                  <Link
                    key={name}
                    href={`/articles?category=${encodeURIComponent(name)}`}
                    className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-ink transition hover:bg-white hover:shadow-sm"
                  >
                    {name}
                    <span className="ml-1 text-brand">({n})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {latest.length > 0 && (
            <div className="rounded-2xl bg-brand-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Just in</p>
              <p className="mt-1 font-display text-lg font-semibold text-brand-ink">Latest Stories</p>
              <ul className="mt-4 space-y-3 text-sm text-brand-ink/80">
                {latest.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/articles/${a.slug}`} className="line-clamp-2 font-medium hover:text-brand">
                      {a.title}
                    </Link>
                    <span className="text-xs text-brand-ink/60">{a.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl bg-brand-soft p-5">
            <p className="font-display text-lg font-semibold text-brand-ink">Need a shortlist?</p>
            <p className="mt-2 text-sm text-brand-ink/80">
              Free guidance on colleges, fees and exams from a counsellor.
            </p>
            <Link
              href="/enquiry" data-track="cta_enquiry"
              className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Request a Callback
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
