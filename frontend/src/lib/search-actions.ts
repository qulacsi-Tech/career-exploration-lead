"use server";

import { searchLive, type SearchResults } from "@/lib/api";

/**
 * The matches shown under the homepage search box as the visitor types. An empty list on any failure, so a
 * slow or unreachable API just leaves the box without suggestions instead of breaking the page.
 */
export async function liveSearch(query: string, stream?: string): Promise<SearchResults> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return { colleges: [], exams: [], locations: [], courses: [] };
  try {
    return await searchLive(q, stream?.trim() || undefined, 5);
  } catch {
    return { colleges: [], exams: [], locations: [], courses: [] };
  }
}
