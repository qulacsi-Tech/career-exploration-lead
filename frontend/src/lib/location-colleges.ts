import { getColleges, type College, type FeaturedStream } from "@/lib/api";
import { cityNamesFor } from "@/lib/location-match";

/**
 * The colleges in a location, optionally only one stream's.
 *
 * A location and its colleges do not always spell the city the same way ("Bangalore"
 * and "Bengaluru"), and the API matches a city by the text it is given. Asking for
 * every known spelling and merging the answers keeps the city page from coming back
 * empty. A college that matches more than one spelling is listed once.
 */
export async function getCollegesInLocation(
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
export type LocationCollegeRef = { slug: string; name: string };
export type LocationHighlights = { branches: LocationBranch[]; colleges: LocationCollegeRef[] };

/**
 * What each homepage location card shows beyond its photo: the streams that have
 * colleges there (most first) and the college names, keyed by the location's slug.
 * Categories and colleges the admin picked for a location win; only a location with none
 * is worked out from the city's colleges. A location whose lookup fails gets empty lists rather than taking the homepage down.
 */
export async function getHighlightsByLocation(
  locations: { slug: string; name: string; featured?: FeaturedStream[] }[],
  streams: { slug: string; name: string }[]
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
        const branches = streams
          .map((s) => ({ ...s, count: colleges.filter((c) => c.stream === s.name).length }))
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        return [location.slug, { branches, colleges: colleges.map((c) => ({ slug: c.slug, name: c.name })) }] as const;
      } catch {
        return [location.slug, { branches: [], colleges: [] }] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}
