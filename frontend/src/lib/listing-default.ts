import { getRankings } from "@/lib/api";
import { getCollegesMenu } from "@/components/colleges-menu-data";

/**
 * Where the colleges list goes when it is opened with no filter at all. There is no list of every
 * college: it opens on the newest NIRF ranking list, or failing that the newest ranking list, or
 * failing that the first link of the header menu. Null only when the site has none of these.
 */
export async function getDefaultListingHref(): Promise<string | null> {
  const lists = (await getRankings().catch(() => [])).filter((l) => l.entries.length > 0);
  const newest = (a: { year: number }, b: { year: number }) => b.year - a.year;
  const pick = lists.filter((l) => /nirf/i.test(l.authority)).sort(newest)[0] ?? [...lists].sort(newest)[0];
  if (pick) return `/colleges?ranking_list=${encodeURIComponent(pick.slug)}`;
  const menu = await getCollegesMenu().catch(() => []);
  return menu[0]?.items[0]?.href ?? null;
}
