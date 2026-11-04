"use server";

import { searchLive, type SearchKind, type SearchResults } from "@/lib/api";

const NONE: SearchResults = { colleges: [], exams: [], locations: [], courses: [], specialisations: [] };

/**
 * The matches shown under the homepage search box as the visitor types, of one kind (colleges, courses,
 * specialisations, exams or cities) or of all. An empty list on any failure, so a slow or unreachable API just
 * leaves the box without suggestions instead of breaking the page.
 */
export async function liveSearch(query: string, kind?: SearchKind): Promise<SearchResults> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return NONE;
  try {
    return await searchLive(q, kind, kind ? 8 : 5);
  } catch {
    return NONE;
  }
}
