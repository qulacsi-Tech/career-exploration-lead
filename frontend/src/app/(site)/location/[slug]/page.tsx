import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { LocationStreams, type LocationStream } from "@/components/location-streams";
import { ApiError, getHomeData, getLocation, getLocations } from "@/lib/api";
import { getCollegesInLocation } from "@/lib/location-colleges";

export async function generateStaticParams() {
  const locs = await getLocations();
  return locs.map((loc) => ({ slug: loc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const location = await getLocation(slug);
    return {
      title: `Colleges in ${location.name}: Streams, Fees & Admissions`,
      description: `Browse engineering, medical, management and other colleges in ${location.name} by stream, with fees, placements, accepted exams and rankings.`,
      alternates: { canonical: `/location/${location.slug}` },
    };
  } catch {
    return { title: "Location not found" };
  }
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let location: Awaited<ReturnType<typeof getLocation>>;
  try {
    location = await getLocation(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Colleges in this city from the live API. Errors are not caught: they reach
  // the route's error boundary rather than rendering an empty city.
  const inCity = await getCollegesInLocation(location);

  // All locations for the "Other cities" sidebar, and the stream and icon lists.
  const [allLocations, home] = await Promise.all([getLocations(), getHomeData()]);

  // Streams that have at least one college in this city, most colleges first.
  const iconOf = new Map((home.fields ?? []).map((f) => [f.slug, f.icon]));
  const streamsHere: LocationStream[] = home.streams
    .map((stream) => ({
      slug: stream.slug,
      name: stream.name,
      count: inCity.filter((college) => college.stream === stream.name).length,
      icon: iconOf.get(stream.slug),
    }))
    .filter((stream) => stream.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: location.name },
      ]}
      title={`Colleges in ${location.name}`}
      subtitle={`${inCity.length} of ${location.collegeCount.toLocaleString()} listed`}
      intro={`Choose a stream to see its colleges in ${location.name}, or scroll down for every college in the city. Compare fees, placements, accepted entrance exams and rankings, and shortlist two or three to open the full comparison.`}
      colleges={inCity}
      emptyMessage={`No colleges in ${location.name} are in the directory yet.`}
      topSection={
        <>
          <LocationStreams locationSlug={location.slug} locationName={location.name} streams={streamsHere} />
          {inCity.length > 0 && (
            <h2 className="mb-4 font-display text-lg font-bold text-ink sm:text-xl">All colleges in {location.name}</h2>
          )}
        </>
      }
      sidebar={
        <>
          <CounsellingCard context={`colleges in ${location.name}`} />
          <SidebarLinks
            title={`Streams in ${location.name}`}
            items={streamsHere.map((stream) => ({
              label: `${stream.name} Colleges`,
              href: `/location/${location.slug}/${stream.slug}`,
              meta: String(stream.count),
            }))}
          />
          <SidebarLinks
            title="Other cities"
            items={allLocations
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
