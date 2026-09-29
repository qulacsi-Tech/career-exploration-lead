import { notFound } from "next/navigation";
import { CollegeMasthead } from "@/components/college/college-masthead";
import { collegePhoto } from "@/lib/college-images";
import { highlightsFor, videosFor } from "@/lib/college-content";
import { faqsOf, monogram, shortNameOf, taglineOf } from "@/lib/college-insights";
import { colleges } from "@/lib/mock-data";
import { collegeSections, sectionHref } from "@/lib/college-sections";

/**
 * Chrome shared by every one of a college's pages: the masthead and the tab
 * rail, over the warm ground the section cards sit on.
 *
 * ## Why a layout and not a component each page renders
 *
 * Next keeps a layout mounted across navigations between its own children, so
 * moving from Courses to Cut-Offs re-renders only the panel below. The banner
 * photograph is not re-fetched or re-decoded and its entrance animation does
 * not replay. The rail's sliding underline also depends on this: a `layoutId`
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

  /* The same fixed rail on every college — see lib/college-sections. */
  const sections = collegeSections.map((section) => ({
    slug: section.slug,
    label: section.label,
    href: sectionHref(college.slug, section.slug),
  }));

  /*
    Dates resolved here, on the server, so the client never renders a
    different value from the one in the static HTML. "Last updated" is the
    record's own save date from the admin; a record without one falls back to
    the build date, which is when this static page last refreshed.
  */
  const now = new Date();
  const intake = now.getFullYear() + 1;
  const saved = college.updatedAt ? new Date(college.updatedAt) : null;
  const updatedOn = shortDate(saved && !Number.isNaN(saved.getTime()) ? saved : now);

  return (
    <div className="bg-bg-alt pb-4">
      <CollegeMasthead
        slug={college.slug}
        name={college.name}
        title={`${shortNameOf(college)}: ${taglineOf(college, intake)}`}
        locality={college.locality}
        city={college.city}
        state={college.state}
        ownership={college.ownership}
        established={college.established}
        approvals={college.approvals}
        rating={college.rating}
        reviewCount={college.reviewCount}
        averagePackage={college.placement.average}
        qnaCount={faqsOf(college).length}
        photo={college.coverImage || collegePhoto(college.slug)}
        logo={college.logo}
        monogram={monogram(college.name)}
        brochureHref={college.brochureUrl || "/enquiry"}
        mediaCount={{
          photos: highlightsFor(college.slug).length,
          videos: videosFor(college.slug).length,
        }}
        sections={sections}
        updatedOn={updatedOn}
      />

      {children}
    </div>
  );
}

/** "28 Sep '26". Built by hand: `toLocaleDateString` gives "Sept" on some runtimes. */
function shortDate(date: Date): string {
  const month = date.toLocaleString("en", { month: "short" }).slice(0, 3);
  return `${date.getDate()} ${month} '${String(date.getFullYear()).slice(-2)}`;
}
