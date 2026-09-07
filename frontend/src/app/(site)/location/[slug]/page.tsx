import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { colleges, locations, homeStreams } from "@/lib/mock-data";
import { matchesCity } from "@/lib/location-match";

export function generateStaticParams() {
  return locations.map((location) => ({ slug: location.slug }));
}

const getLocation = (slug: string) => locations.find((location) => location.slug === slug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocation(slug);
  if (!location) return { title: "Location not found" };

  return {
    title: `Colleges in ${location.name}: Fees, Placements & Admissions`,
    description: `Compare ${location.collegeCount} colleges in ${location.name} by fees, placements, accepted exams and rankings.`,
    alternates: { canonical: `/location/${location.slug}` },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const location = getLocation(slug);
  if (!location) notFound();

  const inCity = colleges.filter((college) =>
    matchesCity(location.slug, location.name, college.city),
  );

  const streamsHere = homeStreams.filter((stream) =>
    inCity.some((college) => college.stream === stream.name),
  );

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: location.name },
      ]}
      title={`Colleges in ${location.name}`}
      subtitle={`${inCity.length} of ${location.collegeCount.toLocaleString()} listed`}
      intro={`Compare colleges in ${location.name} on fees, placements, accepted entrance exams and rankings. Shortlist two or three and open the full comparison.`}
      colleges={inCity}
      emptyMessage={`No colleges in ${location.name} are in the directory yet.`}
      sidebar={
        <>
          <CounsellingCard context={`colleges in ${location.name}`} />
          <SidebarLinks
            title={`Streams in ${location.name}`}
            items={streamsHere.map((stream) => ({
              label: stream.name,
              href: `/${stream.slug}/colleges`,
              meta: String(
                inCity.filter((college) => college.stream === stream.name).length,
              ),
            }))}
          />
          <SidebarLinks
            title="Other cities"
            items={locations
              .filter((other) => other.slug !== location.slug)
              .map((other) => ({
                label: other.name,
                href: `/location/${other.slug}`,
                meta: other.collegeCount.toLocaleString(),
              }))}
          />
        </>
      }
    />
  );
}
