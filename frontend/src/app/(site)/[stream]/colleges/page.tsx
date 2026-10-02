import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { homeStreams, courses, locations } from "@/lib/mock-data";
import { getColleges, getLocations } from "@/lib/api";

/**
 * Stream-scoped college listing — /management/colleges, /engineering/colleges.
 * generateStaticParams is keyed from homeStreams so only known streams get
 * pre-built pages; unknown slugs fall through to notFound().
 */
export function generateStaticParams() {
  return homeStreams.map((stream) => ({ stream: stream.slug }));
}

const getStream = (slug: string) => homeStreams.find((s) => s.slug === slug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stream: string }>;
}): Promise<Metadata> {
  const { stream: streamSlug } = await params;
  const stream = getStream(streamSlug);
  if (!stream) return { title: "Colleges not found" };
  return {
    title: `Top ${stream.name} Colleges: Fees, Placements & Cutoffs`,
    description: `Compare ${stream.name.toLowerCase()} colleges on fees, placements, rankings and accepted entrance exams.`,
    alternates: { canonical: `/${stream.slug}/colleges` },
  };
}

export default async function StreamCollegesPage({
  params,
}: {
  params: Promise<{ stream: string }>;
}) {
  const { stream: streamSlug } = await params;
  const stream = getStream(streamSlug);
  if (!stream) notFound();

  // Live colleges for this stream
  let inStream: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  let total = stream.count; // fall back to the declared count if fetch fails
  try {
    const res = await getColleges({ stream: stream.name, limit: 50 });
    inStream = res.data;
    total = res.meta.total;
  } catch {
    inStream = [];
  }

  // Locations for "By city" sidebar — API with mock fallback
  let allLocations: Awaited<ReturnType<typeof getLocations>> = [];
  try {
    allLocations = await getLocations();
  } catch {
    allLocations = locations;
  }

  // Courses in this stream (CMS catalogue — still from mock-data)
  const streamCourses = courses.filter((course) => course.stream === stream.name);

  // Cities that actually have colleges in this stream
  const citiesWithStream = allLocations.filter((location) =>
    inStream.some((college) =>
      college.city.toLowerCase().startsWith(location.name.toLowerCase().slice(0, 4)),
    ),
  );

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: stream.name },
      ]}
      title={`Top ${stream.name} Colleges`}
      subtitle={`${inStream.length} of ${total.toLocaleString()} listed`}
      intro={`${stream.name} colleges compared on fees, placements, rankings and accepted entrance exams. Add two or three to the compare tray to see them side by side.`}
      colleges={inStream}
      emptyMessage={`No ${stream.name.toLowerCase()} colleges are in the directory yet.`}
      sidebar={
        <>
          <CounsellingCard context={`${stream.name.toLowerCase()} admissions`} />
          {streamCourses.length > 0 && (
            <SidebarLinks
              title={`${stream.name} courses`}
              items={streamCourses.map((course) => ({
                label: course.name,
                href: `/courses/${course.slug}`,
                meta: course.level,
              }))}
            />
          )}
          {citiesWithStream.length > 0 && (
            <SidebarLinks
              title="By city"
              items={citiesWithStream.map((location) => ({
                label: `${stream.name} in ${location.name}`,
                href: `/location/${location.slug}`,
              }))}
            />
          )}
          <SidebarLinks
            title="Other streams"
            items={homeStreams
              .filter((other) => other.slug !== stream.slug)
              .map((other) => ({
                label: other.name,
                href: `/${other.slug}/colleges`,
                meta: other.count.toLocaleString(),
              }))}
          />
        </>
      }
    />
  );
}
