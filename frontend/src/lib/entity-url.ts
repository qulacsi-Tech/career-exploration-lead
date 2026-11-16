/**
 * Addresses for colleges, exams and news: `<slug>-<public id>`, as in /college/iit-bombay-29.
 *
 * The id is what the page is looked up by in spirit: the slug part is for people and search engines
 * and can be reworded, so an address with the wrong slug (or none) is sent on, for good, to the
 * current one. An address with no id at all is a pre-id link (a bookmark, an old search result) and
 * is sent on the same way, so those keep working.
 */

/** The address segment for something with a slug and a public id. No id yet: the slug alone. */
export function entityKey(slug: string, publicId?: number | null): string {
  return publicId && publicId > 0 ? `${slug}-${publicId}` : slug;
}

export type Keyed = { slug: string; publicId?: number | null };

export const collegeKey = (c: Keyed) => entityKey(c.slug, c.publicId);
export const examKey = (e: Keyed) => entityKey(e.slug, e.publicId);
export const articleKey = (a: Keyed) => entityKey(a.slug, a.publicId);

export const collegeHref = (c: Keyed) => `/college/${collegeKey(c)}`;
export const examHref = (e: Keyed) => `/exams/${examKey(e)}`;
export const articleHref = (a: Keyed) => `/articles/${articleKey(a)}`;

/** "iit-bombay-29" is slug "iit-bombay", id 29. No trailing number: null. */
export function parseEntityKey(key: string): { slug: string; id: number } | null {
  const m = /^(.+)-(\d{1,9})$/.exec(key);
  return m ? { slug: m[1], id: Number(m[2]) } : null;
}
