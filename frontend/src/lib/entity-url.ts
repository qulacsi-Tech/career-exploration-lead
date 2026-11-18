/**
 * Addresses for colleges, exams and news: `<public id>-<slug>`, as in /college/29-iit-bombay.
 *
 * The page is looked up by the number; the slug is for people and search engines and can be reworded, so an
 * address with the wrong slug (or an older form) is sent on, for good, to the current one. Older forms that keep
 * working that way: the slug alone (before ids) and `<slug>-<public id>` (the first id form).
 */

/** The address segment for something with a slug and a public id. No id yet: the slug alone. */
export function entityKey(slug: string, publicId?: number | null): string {
  return publicId && publicId > 0 ? `${publicId}-${slug}` : slug;
}

export type Keyed = { slug: string; publicId?: number | null };

export const collegeKey = (c: Keyed) => entityKey(c.slug, c.publicId);
export const examKey = (e: Keyed) => entityKey(e.slug, e.publicId);
export const articleKey = (a: Keyed) => entityKey(a.slug, a.publicId);

export const collegeHref = (c: Keyed) => `/college/${collegeKey(c)}`;
export const examHref = (e: Keyed) => `/exams/${examKey(e)}`;
export const articleHref = (a: Keyed) => `/articles/${articleKey(a)}`;

/**
 * The (id, slug) readings of an address segment, the current form first. "29-iit-bombay" is id 29, slug
 * "iit-bombay"; the older "iit-bombay-29" reads the same. "6-sigma-institute-12" could be either, so both are given.
 */
export function parseEntityKey(key: string): { id: number; slug: string }[] {
  const out: { id: number; slug: string }[] = [];
  const front = /^(\d{1,9})-(.+)$/.exec(key);
  if (front) out.push({ id: Number(front[1]), slug: front[2] });
  const back = /^(.+)-(\d{1,9})$/.exec(key);
  if (back) out.push({ id: Number(back[2]), slug: back[1] });
  return out;
}
