import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { curatedComparisons, collegesBySlugs } from "@/lib/comparison-data";

export const metadata: Metadata = {
  title: "Compare Colleges Side by Side",
  description:
    "Compare colleges on fees, placements, rankings, cutoffs and approvals — with editor-written verdicts on the shortlists students ask about most.",
};

/**
 * The comparison index.
 *
 * Exists so the curated pages are reachable by crawl as well as by search: a
 * page nothing links to is a page that takes far longer to be found.
 */
export default function CompareIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        Compare Colleges
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Side-by-side on fees, placements, ranking, cutoffs and approvals. Start
        from one of the comparisons below, or pick colleges from any listing.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {curatedComparisons.map((comparison) => {
          const colleges = collegesBySlugs(comparison.collegeSlugs);
          return (
            <Link
              key={comparison.slug}
              href={`/compare/${comparison.slug}`}
              className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand"
            >
              <h2 className="font-display text-base font-bold text-ink">{comparison.title}</h2>
              <p className="mt-2 text-xs text-ink-faint">
                {colleges.map((c) => c.name).join(" vs ")}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{comparison.intro}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
