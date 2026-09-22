import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { College } from "@/lib/mock-data";
import { sectionHref, sectionsFor } from "@/lib/college-sections";

/**
 * The frame every college section page shares: breadcrumb, heading, body, and
 * a link on to the next section.
 *
 * Written once because ten pages that each lay out their own heading drift
 * within a fortnight — and because the "next section" link at the foot is the
 * thing that replaces scrolling. Splitting a long page into ten costs the
 * visitor the ability to simply keep going; a deliberate onward link gives it
 * back, and it is derived from the same ordered list the rail uses, so it can
 * never point somewhere this college does not have.
 *
 * The breadcrumb is the shared `Breadcrumbs` component rather than the
 * hand-rolled one inside the hero. The hero's version is white-on-photograph
 * and belongs to the hero; this one sits on the page ground with the rest of
 * the site's breadcrumbs.
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
  const available = sectionsFor(college);
  const index = available.findIndex((section) => section.slug === sectionSlug);
  const section = available[index];
  const next = index >= 0 ? available[index + 1] : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Colleges", href: "/colleges" },
          { label: college.name, href: `/college/${college.slug}` },
          { label: section?.label ?? "" },
        ]}
      />

      <header className="mt-3 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {section?.label} at {college.name}
        </h1>
        {section && (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{section.blurb(college)}</p>
        )}
      </header>

      <div className="mt-8">{children}</div>

      {next && (
        <div className="mt-14 border-t border-line pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Next
          </p>
          <Link
            href={sectionHref(college.slug, next.slug)}
            className="group mt-1.5 inline-flex items-center gap-2 font-display text-lg font-bold text-ink transition-colors hover:text-brand"
          >
            {next.label}
            <ArrowUpRight className="h-4 w-4 text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
