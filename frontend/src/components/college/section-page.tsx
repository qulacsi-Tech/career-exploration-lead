import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { College } from "@/lib/mock-data";
import { collegeSections, sectionHref } from "@/lib/college-sections";

/**
 * The frame every college section page shares: breadcrumb, heading, a column
 * of cards, and a card on to the next section.
 *
 * The column is the same width as the overview's, so moving between tabs
 * changes the cards and nothing else. The "next" card at the foot is what
 * replaces scrolling: splitting one long page into many costs the visitor the
 * ability to simply keep going, and a deliberate onward link gives it back.
 * It is derived from the same ordered list the rail uses, so it can never
 * point somewhere this college does not have.
 *
 * The heading is an h2 — the college's name in the masthead is the page's h1.
 */
export function CollegeSectionPage({
  college,
  sectionSlug,
  children,
}: {
  college: College;
  sectionSlug: string;
  children: React.ReactNode;
}) {
  const available = collegeSections;
  const index = available.findIndex((section) => section.slug === sectionSlug);
  const section = available[index];
  const next = index >= 0 ? available[index + 1] : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: "/colleges" },
          { label: college.name, href: `/college/${college.slug}` },
          { label: section?.label ?? "" },
        ]}
      />

      <header className="mt-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {college.name} {section?.label}
        </h2>
        {section && (
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-soft">
            {section.blurb(college)}
          </p>
        )}
      </header>

      <div className="mt-8 space-y-8">{children}</div>

      {next && (
        <Link
          href={sectionHref(college.slug, next.slug)}
          className="group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(28,33,40,0.06)] transition hover:border-brand/50 sm:p-8"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Next
            </span>
            <span className="mt-1 block font-display text-xl font-bold text-ink transition-colors group-hover:text-brand">
              {next.label}
            </span>
            <span className="mt-1 block text-sm text-ink-soft">{next.blurb(college)}</span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5" />
          </span>
        </Link>
      )}
    </div>
  );
}
