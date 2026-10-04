import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { ApiError, getColleges, getHomeData, getLocation, getLocations } from "@/lib/api";

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
      title: `Colleges in ${location.name}: Fees, Placements & Admissions`,
      description: `Compare ${location.collegeCount} colleges in ${location.name} by fees, placements, accepted exams and rankings.`,
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
  const { data: inCity } = await getColleges({ city: location.name, limit: 50 });

  // All locations for the "Other cities" sidebar
  const allLocations = await getLocations();

  // Streams that have at least one college in this city
  const streamsHere = (await getHomeData()).streams.filter((stream) =>
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
              meta: String(inCity.filter((college) => college.stream === stream.name).length),
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
