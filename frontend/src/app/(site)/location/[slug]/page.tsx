import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import type { LocationStream } from "@/components/location-streams";
import { LocationStreamFilter } from "@/components/location-stream-filter";
import { ApiError, getHomeData, getLocations } from "@/lib/api";
import { getLocationOrSample } from "@/lib/sample-locations";
import { getCollegesInLocation, streamsIn } from "@/lib/location-colleges";

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
    const location = await getLocationOrSample(slug);
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ stream?: string | string[] }>;
}) {
  const { slug } = await params;
  const { stream: streamParam } = await searchParams;
  const requested = Array.isArray(streamParam) ? streamParam[0] : streamParam;

  let location: Awaited<ReturnType<typeof getLocationOrSample>>;
  try {
    location = await getLocationOrSample(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Colleges in this city from the live API. Errors are not caught: they reach
  // the route's error boundary rather than rendering an empty city.
  const inCity = await getCollegesInLocation(location);

  // All locations for the "Other cities" sidebar, and the stream and icon lists.
  // A payload that cannot be fetched only costs the sidebar and the icons, not the page.
  const [allLocations, home] = await Promise.all([
    getLocations().catch(() => []),
    getHomeData().catch(() => null),
  ]);

  // Streams that have at least one college in this city, most colleges first.
  const iconOf = new Map((home?.fields ?? []).map((f) => [f.slug, f.icon]));
  const streamsHere: LocationStream[] = streamsIn(inCity, iconOf);

  // An unknown or empty stream in the URL just shows everything, like the reset.
  const active = streamsHere.find((stream) => stream.slug === requested);
  const shown = active ? inCity.filter((college) => college.stream === active.name) : inCity;
  const heading = active ? `${active.name} colleges in ${location.name}` : `All colleges in ${location.name}`;

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: location.name },
      ]}
      title={active ? `${active.name} Colleges in ${location.name}` : `Colleges in ${location.name}`}
      subtitle={active ? `${shown.length} listed` : `${inCity.length} of ${location.collegeCount.toLocaleString()} listed`}
      intro={`Choose a stream to see its colleges in ${location.name}, or scroll down for every college in the city. Compare fees, placements, accepted entrance exams and rankings, and shortlist two or three to open the full comparison.`}
      colleges={shown}
      emptyMessage={`No colleges in ${location.name} are in the directory yet.`}
      topSection={
        <>
          <LocationStreamFilter
            locationSlug={location.slug}
            streams={streamsHere}
            activeSlug={active?.slug}
            total={inCity.length}
          />
          {shown.length > 0 && <h2 className="mb-4 font-display text-lg font-bold text-ink sm:text-xl">{heading}</h2>}
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
