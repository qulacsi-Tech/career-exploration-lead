import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { search, type SearchResults } from "@/lib/api";

type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q } = await searchParams;
  const term = q?.trim();
  return {
    title: term ? `Search results for "${term}"` : "Search colleges, exams and cities",
    // Search result pages are for visitors, not for the index.
    robots: { index: false, follow: true },
  };
}

/**
 * Search results for the header and hero search box. Colleges, exams and cities
 * are shown as three groups, each linking to its own page.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const results: SearchResults | null = term ? await search(term) : null;
  const total = results ? results.colleges.length + results.exams.length + results.locations.length : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        {term ? `Results for “${term}”` : "Search"}
      </h1>

      {!term && (
        <p className="mt-2 text-sm text-ink-soft">
          Type a college, exam or city in the search box to see matches.
        </p>
      )}

      {results && total === 0 && (
        <p className="mt-6 text-sm text-ink-soft">
          Nothing matched “{term}”. Try a shorter word, or browse the{" "}
          <Link href="/colleges" className="font-semibold text-brand hover:underline">
            colleges directory
          </Link>
          .
        </p>
      )}

      {results && results.colleges.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink">Colleges</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {results.colleges.map((college) => (
              <li key={college.slug}>
                <Link href={`/college/${college.slug}`} className="block px-5 py-3 transition hover:bg-bg">
                  <p className="font-medium text-ink">{college.name}</p>
                  <p className="text-xs text-ink-faint">
                    {college.city} · {college.stream}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.exams.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink">Exams</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {results.exams.map((exam) => (
              <li key={exam.slug}>
                <Link
                  href={`/exams/${exam.slug}`}
                  className="inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand"
                >
                  {exam.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.locations.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink">Cities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {results.locations.map((location) => (
              <li key={location.slug}>
                <Link
                  href={`/location/${location.slug}`}
                  className="inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand"
                >
                  {location.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
