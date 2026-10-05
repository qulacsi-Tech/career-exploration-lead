import { getColleges, type College } from "@/lib/api";
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
