import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { homeStreams, locations } from "@/lib/mock-data";
import { getColleges, getLocation, getLocations } from "@/lib/api";

export async function generateStaticParams() {
  try {
    const locs = await getLocations();
    return locs.map((loc) => ({ slug: loc.slug }));
  } catch {
    // Fallback to mock slugs so the build never hard-fails
    return locations.map((loc) => ({ slug: loc.slug }));
  }
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
  } catch {
    notFound();
  }

  // Colleges in this city from live API
  let inCity: Awaited<ReturnType<typeof getColleges>>["data"] = [];
  try {
    const res = await getColleges({ city: location.name, limit: 50 });
    inCity = res.data;
  } catch {
    inCity = [];
  }

  // All locations for "Other cities" sidebar — from API with mock fallback
  let allLocations: Awaited<ReturnType<typeof getLocations>> = [];
  try {
    allLocations = await getLocations();
  } catch {
    allLocations = locations;
  }

  // Streams that have at least one college in this city
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
