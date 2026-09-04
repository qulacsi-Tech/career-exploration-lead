import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { colleges, homeStreams, courses, locations } from "@/lib/mock-data";

/**
 * Stream-scoped college listing — /management/colleges, /engineering/colleges.
 *
 * The dynamic segment sits at the site root, which looks alarming until you
 * note that Next matches static segments first: /colleges, /courses, /compare
 * and /college/[slug] all win against `[stream]` because a literal path segment
 * outranks a dynamic one. This only ever catches a two-segment path ending in
 * "/colleges", and `generateStaticParams` plus the notFound below keep it from
 * answering for streams that do not exist.
 */
export function generateStaticParams() {
  return homeStreams.map((stream) => ({ stream: stream.slug }));
}

const getStream = (slug: string) => homeStreams.find((stream) => stream.slug === slug);

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

  const inStream = colleges.filter((college) => college.stream === stream.name);
  const streamCourses = courses.filter((course) => course.stream === stream.name);

  // Only cities that actually have a college in this stream — a link to
  // "Medical colleges in Pune" with nothing behind it is worse than no link.
  const citiesWithStream = locations.filter((location) =>
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
      subtitle={`${inStream.length} of ${stream.count.toLocaleString()} listed`}
      intro={`${stream.name} colleges compared on fees, placements, rankings and accepted entrance exams. Add two or three to the compare tray to see them side by side.`}
      colleges={inStream}
      emptyMessage={`No ${stream.name.toLowerCase()} colleges are in the directory yet.`}
      sidebar={
        <>
          <CounsellingCard context={`${stream.name.toLowerCase()} admissions`} />
          <SidebarLinks
            title={`${stream.name} courses`}
            items={streamCourses.map((course) => ({
              label: course.name,
              href: `/courses/${course.slug}`,
              meta: course.level,
            }))}
          />
          <SidebarLinks
            title="By city"
            items={citiesWithStream.map((location) => ({
              label: `${stream.name} in ${location.name}`,
              href: `/location/${location.slug}`,
            }))}
          />
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
