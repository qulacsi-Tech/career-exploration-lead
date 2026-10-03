import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { getColleges, getCourses, getHomeData, getLocations } from "@/lib/api";

/**
 * Stream-scoped college listing — /management/colleges, /engineering/colleges.
 * generateStaticParams is keyed from the home payload's streams so only known
 * streams get pre-built pages; unknown slugs fall through to notFound().
 *
 * `cache` makes the home payload one request per render, shared by the metadata
 * and the page, rather than one per call.
 */
const loadHome = cache(getHomeData);

export async function generateStaticParams() {
  const home = await loadHome();
  return home.streams.map((stream) => ({ stream: stream.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stream: string }>;
}): Promise<Metadata> {
  const { stream: streamSlug } = await params;
  const home = await loadHome();
  const stream = home.streams.find((s) => s.slug === streamSlug);
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
  const home = await loadHome();
  const stream = home.streams.find((s) => s.slug === streamSlug);
  if (!stream) notFound();

  // Errors are not caught here: a failed request reaches the route's error
  // boundary, rather than rendering an empty directory that looks real.
  const [{ data: inStream, meta }, allLocations, { data: streamCourses }] = await Promise.all([
    getColleges({ stream: stream.name, limit: 50 }),
    getLocations(),
    getCourses({ stream: stream.name, limit: 200 }),
  ]);

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
      subtitle={`${inStream.length} of ${meta.total.toLocaleString()} listed`}
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
            items={home.streams
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
