import { notFound } from "next/navigation";
import { CollegeHero } from "@/components/college/college-hero";
import { SectionRail } from "@/components/college/section-rail";
import { collegePhoto } from "@/lib/college-images";
import { colleges } from "@/lib/mock-data";
import { sectionHref, sectionsFor } from "@/lib/college-sections";

/**
 * Chrome shared by every one of a college's pages: the hero and the tab rail.
 *
 * ## Why a layout and not a component each page renders
 *
 * Next keeps a layout mounted across navigations between its own children, so
 * moving from Courses to Cutoffs re-renders only the panel below. The hero
 * photograph is not re-fetched or re-decoded and its entrance animation does
 * not replay — which it would, on every single tab click, if each page drew its
 * own hero. The rail's sliding underline also depends on this: a `layoutId`
 * transition needs both the old and new element to exist in one persistent
 * tree, so in any other arrangement the underline would cut rather than slide.
 *
 * The college is resolved twice, here and in the page — that is the shape of
 * the App Router and it costs nothing against an in-memory array. It will cost
 * one request each against a real API, at which point `cache()` around the
 * lookup is the fix.
 */
export default async function CollegeLayout({
  children,
  params,
}: LayoutProps<"/college/[slug]">) {
  const { slug } = await params;
  const college = colleges.find((entry) => entry.slug === slug);
  if (!college) notFound();

  /* Only the sections this college has anything for, so no tab leads to a
     page that will 404 — both read the same predicate. */
  const sections = sectionsFor(college).map((section) => ({
    slug: section.slug,
    label: section.label,
    href: sectionHref(college.slug, section.slug),
  }));

  return (
    <div>
      <CollegeHero
        name={college.name}
        city={college.city}
        state={college.state}
        ownership={college.ownership}
        established={college.established}
        approvals={college.approvals}
        rank={college.ranking.rank}
        authority={college.ranking.authority}
        rating={college.rating}
        reviewCount={college.reviewCount}
        feesRange={college.feesRange}
        photo={collegePhoto(college.slug)}
      />

      <SectionRail sections={sections} collegeSlug={college.slug} />

      {children}
    </div>
  );
}
