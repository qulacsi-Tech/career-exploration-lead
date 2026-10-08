import { getColleges, type College, type FeaturedStream } from "@/lib/api";
import { cityNamesFor } from "@/lib/location-match";
import { colleges as mockColleges } from "@/lib/mock-data";
import { STATIC_LOCATIONS } from "@/lib/sample-locations";

/** The slug the API gives a category: "Management" -> "management". */
export const streamSlug = (name: string) => name.toLowerCase().replace(/ /g, "-");

/** The categories present in a set of colleges, most colleges first. */
export function streamsIn(colleges: { stream: string }[], iconOf?: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const c of colleges) counts.set(c.stream, (counts.get(c.stream) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ slug: streamSlug(name), name, count, icon: iconOf?.get(streamSlug(name)) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * The colleges in a location, optionally only one stream's.
 *
 * A location and its colleges do not always spell the city the same way ("Bangalore"
 * and "Bengaluru"), and the API matches a city by the text it is given. Asking for
 * every known spelling and merging the answers keeps the city page from coming back
 * empty. A college that matches more than one spelling is listed once.
 *
 * The six sample destinations (see sample-locations.ts) fall back to the built-in sample
 * colleges when the API has none for the city, or cannot be reached, so a demo against an
 * empty or offline backend still shows a full destination. Real locations never do.
 */
export async function getCollegesInLocation(
  location: { slug: string; name: string },
  stream?: string
): Promise<College[]> {
  const isSample = STATIC_LOCATIONS.some((l) => l.slug === location.slug);
  let live: College[] = [];
  try {
    live = await fetchCollegesInLocation(location, stream);
  } catch (err) {
    if (!isSample) throw err;
  }
  if (live.length > 0 || !isSample) return live;

  const names = cityNamesFor(location.slug, location.name);
  return (mockColleges as unknown as College[]).filter(
    (c) => names.includes(c.city.toLowerCase()) && (!stream || c.stream === stream || streamSlug(c.stream) === stream)
  );
}

async function fetchCollegesInLocation(
  location: { slug: string; name: string },
  stream?: string
): Promise<College[]> {
  const spellings = [...new Set(cityNamesFor(location.slug, location.name))];
  const results = await Promise.all(spellings.map((city) => getColleges({ city, stream, limit: 50 })));

  const seen = new Set<string>();
  const merged: College[] = [];
  for (const result of results) {
    for (const college of result.data) {
      if (seen.has(college.slug)) continue;
      seen.add(college.slug);
      merged.push(college);
    }
  }
  return merged;
}

export type LocationBranch = { slug: string; name: string; count: number };
export type LocationCollegeRef = {
  slug: string;
  name: string;
  /** Used for the rankings and rating shown over the card's photo. Absent on colleges the admin picked by hand. */
  ranking?: { authority: string; rank: number };
  rating?: number;
};
export type LocationHighlights = { branches: LocationBranch[]; colleges: LocationCollegeRef[] };

/**
 * What each homepage location card shows beyond its photo: the streams that have
 * colleges there (most first) and the college names, keyed by the location's slug.
 * Categories and colleges the admin picked for a location win; only a location with none
 * is worked out from the city's colleges. A location whose lookup fails gets empty lists rather than taking the homepage down.
 */
export async function getHighlightsByLocation(
  locations: { slug: string; name: string; featured?: FeaturedStream[] }[]
): Promise<Record<string, LocationHighlights>> {
  const entries = await Promise.all(
    locations.map(async (location) => {
      if (location.featured && location.featured.length > 0) {
        return [
          location.slug,
          {
            branches: location.featured.map((f) => ({ slug: f.stream, name: f.name, count: f.colleges.length })),
            colleges: location.featured.flatMap((f) => f.colleges),
          },
        ] as const;
      }
      try {
        const colleges = await getCollegesInLocation(location);
        // From the colleges themselves, so it does not depend on the home payload's category list.
        const branches = streamsIn(colleges).map(({ slug, name, count }) => ({ slug, name, count }));
        return [location.slug, { branches, colleges: colleges.map((c) => ({ slug: c.slug, name: c.name, ranking: c.ranking, rating: c.rating })) }] as const;
      } catch {
        return [location.slug, { branches: [], colleges: [] }] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}
