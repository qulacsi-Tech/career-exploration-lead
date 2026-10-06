import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CollegeListing,
  CounsellingCard,
  SidebarLinks,
} from "@/components/college-listing";
import { LocationStreams, type LocationStream } from "@/components/location-streams";
import { ApiError, getHomeData } from "@/lib/api";
import { getLocationOrSample } from "@/lib/sample-locations";
import { getCollegesInLocation, streamsIn } from "@/lib/location-colleges";

/**
 * One stream's colleges in one city: /location/bangalore/engineering lists
 * "Engineering Colleges in Bangalore". The city page links here for every stream it
 * has colleges in. An unknown city or stream is a 404; a known stream with no colleges
 * in the city shows an honest empty state rather than a page that looks broken.
 *
 * `cache` makes the home payload one request per render, shared by the metadata and
 * the page.
 */
const loadHome = cache(() => getHomeData().catch(() => null));
const loadCity = cache((slug: string, name: string) => getCollegesInLocation({ slug, name }));

async function resolve(slug: string, streamSlug: string) {
  let location: Awaited<ReturnType<typeof getLocationOrSample>>;
  try {
    location = await getLocationOrSample(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
  const [home, inCity] = await Promise.all([loadHome(), loadCity(location.slug, location.name)]);
  // The category comes from the colleges in the city, so it does not depend on the home payload.
  const stream =
    streamsIn(inCity).find((s) => s.slug === streamSlug) ?? home?.streams.find((s) => s.slug === streamSlug);
  if (!stream) return null;
  return { location, stream, home, inCity };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; stream: string }>;
}): Promise<Metadata> {
  const { slug, stream: streamSlug } = await params;
  const found = await resolve(slug, streamSlug);
  if (!found) return { title: "Colleges not found" };
  const { location, stream } = found;
  return {
    title: `${stream.name} Colleges in ${location.name}: Fees, Placements & Admissions`,
    description: `Compare ${stream.name.toLowerCase()} colleges in ${location.name} on fees, placements, rankings and accepted entrance exams.`,
    alternates: { canonical: `/location/${location.slug}/${stream.slug}` },
  };
}

export default async function LocationStreamPage({
  params,
}: {
  params: Promise<{ slug: string; stream: string }>;
}) {
  const { slug, stream: streamSlug } = await params;
  const found = await resolve(slug, streamSlug);
  if (!found) notFound();
  const { location, stream, home, inCity } = found;
  const inStream = inCity.filter((college) => college.stream === stream.name);

  const iconOf = new Map((home?.fields ?? []).map((f) => [f.slug, f.icon]));
  const streamsHere: LocationStream[] = streamsIn(inCity, iconOf);

  return (
    <CollegeListing
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Colleges", href: "/colleges" },
        { label: location.name, href: `/location/${location.slug}` },
        { label: stream.name },
      ]}
      title={`${stream.name} Colleges in ${location.name}`}
      subtitle={`${inStream.length} listed`}
      intro={`Compare ${stream.name.toLowerCase()} colleges in ${location.name} on fees, placements, accepted entrance exams and rankings.`}
      colleges={inStream}
      emptyMessage={`No ${stream.name.toLowerCase()} colleges in ${location.name} are in the directory yet.`}
      topSection={
        streamsHere.length > 1 ? (
          <LocationStreams
            locationSlug={location.slug}
            locationName={location.name}
            streams={streamsHere}
            activeSlug={stream.slug}
          />
        ) : null
      }
      sidebar={
        <>
          <CounsellingCard context={`${stream.name.toLowerCase()} colleges in ${location.name}`} />
          <SidebarLinks
            title={`More in ${location.name}`}
            items={streamsHere
              .filter((s) => s.slug !== stream.slug)
              .map((s) => ({
                label: `${s.name} Colleges`,
                href: `/location/${location.slug}/${s.slug}`,
                meta: String(s.count),
              }))}
          />
          <SidebarLinks
            title={`${stream.name} colleges elsewhere`}
            items={[{ label: `All ${stream.name} Colleges`, href: `/${stream.slug}/colleges` }]}
          />
        </>
      }
    />
  );
}
