/**
 * Server-side resolution for comparison pages.
 *
 * The curated copy and the pure helpers live in comparison-data.ts, which client
 * components import. Anything that touches the API lives here, so the client
 * bundle never pulls in the fetch layer for a comparison it only renders.
 */

import { getCollegeOrNull, getSimilarColleges, type CollegeDetail } from "@/lib/api";
import { MAX_COMPARE, curatedBySlug, type CuratedComparison } from "@/lib/comparison-data";

/**
 * Looks up colleges by slug, dropping the ones the API does not know.
 * Callers that need every slug to resolve compare the length (see resolveComparison).
 */
export async function collegesBySlugs(slugs: string[]): Promise<CollegeDetail[]> {
  const found = await Promise.all(slugs.map((slug) => getCollegeOrNull(slug)));
  return found.filter((college): college is CollegeDetail => college !== null);
}

/**
 * Suggested opponents for a college with no curated pair: same stream, nearest
 * by rank. Someone comparing is choosing between peers, and a college fifty
 * places away is not a peer. The API ranks the peers; see the colleges
 * similar endpoint.
 */
export const similarColleges = (college: CollegeDetail, limit = 3) =>
  getSimilarColleges(college.slug, limit);

/**
 * Resolves a `/compare/[slug]` path back to colleges.
 *
 * Curated pages win over the generated form, so an editor can take over a URL
 * that was previously auto-resolving without breaking the link.
 *
 * The generated form splits on "-vs-", which is unambiguous only because no
 * college slug contains it — worth knowing if slugs ever become free text.
 */
export async function resolveComparison(
  slug: string
): Promise<{ curated: CuratedComparison | null; colleges: CollegeDetail[] } | null> {
  const curated = curatedBySlug(slug);
  if (curated) {
    const colleges = await collegesBySlugs(curated.collegeSlugs);
    // A curated pair whose colleges are not in the API (e.g. not seeded yet, or the
    // API unreachable during a build) is a 404, not a page with nothing to compare.
    if (colleges.length !== curated.collegeSlugs.length) return null;
    return { curated, colleges };
  }

  const parts = slug.split("-vs-");
  if (parts.length < 2 || parts.length > MAX_COMPARE) return null;

  const found = await collegesBySlugs(parts);
  // Every part must resolve: a URL naming a college that does not exist is a
  // 404, not a comparison with a gap in it.
  if (found.length !== parts.length) return null;

  return { curated: null, colleges: found };
}
