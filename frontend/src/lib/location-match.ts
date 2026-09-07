/**
 * Matching a city in the locations directory to the city written on a college
 * record.
 *
 * The two are not always spelled the same — "Bangalore" in the locations list,
 * "Bengaluru" on the colleges — so a plain equality check silently returns an
 * empty city page. Aliases keep the join working without rewriting either side.
 *
 * Lifted out of app/(site)/location/[slug]/page.tsx, which owned the only copy
 * until collections needed the same join for their location scope. Two copies
 * of an alias table is exactly the drift this codebase avoids elsewhere: adding
 * "Kolkata"/"Calcutta" in one place and not the other produces a city page and
 * a collection that disagree about which colleges are in the city.
 *
 * This is the kind of thing that becomes a real column — colleges carrying a
 * `locationSlug` foreign key — the moment the API exists. Until then it lives
 * here rather than being quietly wrong.
 */

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ["bangalore", "bengaluru"],
  "delhi-ncr": ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "delhi ncr"],
  mumbai: ["mumbai", "navi mumbai", "thane"],
};

/**
 * Does `collegeCity` fall under the location identified by `citySlug`?
 *
 * `cityName` is passed rather than looked up so this stays a pure function over
 * strings — callers already hold the location record, and it keeps the module
 * free of a dependency on the locations list.
 */
export const matchesCity = (citySlug: string, cityName: string, collegeCity: string) => {
  const names = CITY_ALIASES[citySlug] ?? [cityName.toLowerCase()];
  return names.includes(collegeCity.toLowerCase());
};
