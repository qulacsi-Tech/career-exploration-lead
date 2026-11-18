import { notFound, permanentRedirect } from "next/navigation";
import { ApiError, getArticle, getCollege, getExam, getSlugForPublicId, type PublicIdKind } from "@/lib/api";
import { entityKey, parseEntityKey, type Keyed } from "@/lib/entity-url";

/** Which kind of record a fetcher reads, so the number in an address can be looked up for it. */
const KIND = new Map<unknown, PublicIdKind>([
  [getCollege, "college"],
  [getExam, "exam"],
  [getArticle, "article"],
]);

const orNull = async <T,>(read: () => Promise<T>): Promise<T | null> => {
  try {
    return await read();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

/**
 * The record an address names, or null. Looked up by the number in it (so a reworded slug still finds the page),
 * preferring the reading whose slug matches; then the whole segment as a plain slug (a pre-id link, or a slug that
 * starts or ends with a number); then any record the number found. Only a 404 means "no such record".
 */
export async function findByKey<T extends Keyed>(key: string, fetcher: (slug: string) => Promise<T>): Promise<T | null> {
  const kind = KIND.get(fetcher);
  let byNumber: T | null = null;
  if (kind) {
    for (const reading of parseEntityKey(key)) {
      const slug = await orNull(() => getSlugForPublicId(kind, reading.id));
      if (!slug) continue;
      const record = await orNull(() => fetcher(slug));
      if (!record) continue;
      if (record.slug === reading.slug) return record;
      byNumber ??= record;
    }
  }
  return (await orNull(() => fetcher(key))) ?? byNumber;
}

/**
 * `findByKey` for a page: a missing record is a 404, and an address that is not the record's own (an older form,
 * a stale slug) redirects for good to `toPath(record)`.
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
