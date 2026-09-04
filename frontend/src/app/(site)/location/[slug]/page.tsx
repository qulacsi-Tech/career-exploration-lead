import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { colleges, locations, homeStreams } from "@/lib/mock-data";

export function generateStaticParams() {
  return locations.map((location) => ({ slug: location.slug }));
}

const getLocation = (slug: string) => locations.find((location) => location.slug === slug);

/**
 * The city's name in the directory and the city on a college record are not
 * always spelled the same — "Bangalore" in the locations list, "Bengaluru" on
 * the colleges. Aliases keep the join working without rewriting either.
 *
 * This is exactly the kind of thing that becomes a real column once the API
 * exists; for now it lives here rather than being silently wrong.
 */
const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ["bangalore", "bengaluru"],
  "delhi-ncr": ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "delhi ncr"],
  mumbai: ["mumbai", "navi mumbai", "thane"],
};

const matchesCity = (citySlug: string, cityName: string, collegeCity: string) => {
  const names = CITY_ALIASES[citySlug] ?? [cityName.toLowerCase()];
  return names.includes(collegeCity.toLowerCase());
};

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
