import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ComparisonTable } from "@/components/comparison-table";
import { CollegeCard } from "@/components/college-card";
import {
  curatedComparisons,
  resolveComparison,
  similarColleges,
  compareUrl,
} from "@/lib/comparison-data";

/**
 * A comparison page.
 *
 * Server-rendered at a real URL rather than a modal, because comparison
 * searches are the highest-intent traffic this site can attract and a modal
 * captures none of it. See lib/comparison-data for the reasoning.
 *
 * Only the curated comparisons are prerendered. Ad-hoc ones — a visitor
 * comparing two colleges from a listing — render on demand: there are
 * n-choose-2 of them, which is not a set worth building at deploy time.
 */
export function generateStaticParams() {
  return curatedComparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveComparison(slug);
  if (!resolved) return { title: "Comparison not found" };

  const { curated, colleges } = resolved;
  const names = colleges.map((c) => c.name).join(" vs ");

  return {
    title: curated?.title ?? `${names}: Fees, Placements & Rankings Compared`,
    description:
      curated?.metaDescription ??
      `Compare ${names} on fees, placements, ranking, cutoffs and approvals.`,
    alternates: {
      // An ad-hoc comparison can be reached with its slugs in either order, so
      // the canonical points at the sorted form to keep one URL per comparison.
      canonical: curated ? `/compare/${curated.slug}` : compareUrl(colleges.map((c) => c.slug)),
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveComparison(slug);
  if (!resolved) notFound();

  const { curated, colleges } = resolved;
  const names = colleges.map((c) => c.name).join(" vs ");

  // Peers of the first college that are not already in the table — the natural
  // next comparison for someone who has read this one.
  const alsoConsider = similarColleges(colleges[0], 4).filter(
    (c) => !colleges.some((inTable) => inTable.slug === c.slug),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: curated?.title ?? names },
        ]}
      />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
        {curated?.title ?? `${names} compared`}
      </h1>

      {curated && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{curated.intro}</p>
      )}

      <section className="mt-8">
        <h2 className="sr-only">Comparison table</h2>
        <ComparisonTable colleges={colleges} />
      </section>

      {/* The editorial verdict is what separates this from two data columns,
          and it is the reason the page is worth ranking. */}
      {curated && (
        <section className="mt-8 rounded-2xl border border-brand/30 bg-brand-soft p-6">
          <h2 className="font-display text-lg font-bold text-brand-ink">Our verdict</h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-ink/90">{curated.verdict}</p>
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-3">
        {colleges.map((college) => (
          <Link
            key={college.slug}
            href={`/college/${college.slug}`}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
          >
            Full profile: {college.name}
          </Link>
        ))}
      </section>

      {alsoConsider.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-ink">Also worth comparing</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {alsoConsider.slice(0, 2).map((college) => (
              <CollegeCard key={college.slug} college={college} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
