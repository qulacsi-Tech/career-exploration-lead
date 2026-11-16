import { notFound, permanentRedirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { entityKey, parseEntityKey, type Keyed } from "@/lib/entity-url";

/**
 * The record an address names, or null. The slug part is tried first, then the whole address as a slug. Only a 404 means "no such
 * record"; any other failure still throws.
 */
export async function findByKey<T extends Keyed>(key: string, fetcher: (slug: string) => Promise<T>): Promise<T | null> {
  const bySlug = async (slug: string): Promise<T | null> => {
    try {
      return await fetcher(slug);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  };
  const parsed = parseEntityKey(key);
  if (!parsed) return bySlug(key);
  const named = await bySlug(parsed.slug);
  // The slug and the id agree: the address is the record's own.
  if (named && named.publicId === parsed.id) return named;
  // Otherwise the number may be part of an older, id-less slug ("mht-cet-2024"): that record wins if it exists.
  return (await bySlug(key)) ?? named;
}

/**
 * `findByKey` for a page: a missing record is a 404, and an address that is not the record's own
 * (no id, a stale slug, someone else's id) redirects to `toPath(record)`.
 */
export async function resolveByKey<T extends Keyed>(
  key: string,
  fetcher: (slug: string) => Promise<T>,
  toPath: (record: T) => string,
): Promise<T> {
  const record = await findByKey(key, fetcher);
  if (!record) notFound();
  if (key !== entityKey(record.slug, record.publicId)) permanentRedirect(toPath(record));
  return record;
}
