/**
 * Where a college's photography comes from.
 *
 * The hero, the cards and the gallery all need the same answer for the same
 * slug — a college whose card shows one campus and whose hero shows another
 * reads as a bug. `top-college-card.tsx` carried a three-entry map of its own
 * and fell back to the Bengaluru photo for everything else, so five of the
 * eight colleges showed the wrong campus. This is that map, widened to the
 * whole photo pool and shared.
 *
 * `POOL` is every campus photograph in /public/images. The fallback picks from
 * it by hashing the slug rather than taking POOL[0]: a college with no photo of
 * its own still gets a *stable* one that differs from its neighbours, so a
 * listing grid does not repeat the same building six times. Swap an entry into
 * `BY_SLUG` the moment real art lands and nothing else has to change.
 */

const POOL = [
  "/images/colleges/bengaluru-institute-of-management-studies.jpg",
  "/images/colleges/horizon-school-of-business.jpg",
  "/images/colleges/eastwind-institute-of-management.jpg",
  "/images/universities/kr-mangalam-university.jpg",
  "/images/universities/clark-university.jpg",
  "/images/universities/swarnam-university.jpg",
  "/images/banners/promo-banner-campus.jpg",
] as const;

const BY_SLUG: Record<string, string> = {
  "bengaluru-institute-of-management-studies": POOL[0],
  "horizon-school-of-business": POOL[1],
  "eastwind-institute-of-management": POOL[2],
  "kr-mangalam-university": POOL[3],
};

/** djb2, trimmed to 32 bits. Any stable string hash does; this one is short. */
function hash(value: string) {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The college's primary photograph — its own where we have one. */
export function collegePhoto(slug: string): string {
  return BY_SLUG[slug] ?? POOL[hash(slug) % POOL.length];
}

/**
 * `count` distinct photographs for this college, starting with its primary.
 *
 * Used by the gallery strip, which needs several frames and would otherwise
 * repeat one. Walks the pool from the primary's position so the set is stable
 * per slug, and stops at the pool size rather than looping.
 */
export function collegePhotoSet(slug: string, count: number): string[] {
  const primary = collegePhoto(slug);
  const rest = POOL.filter((src) => src !== primary);
  const start = hash(slug) % Math.max(rest.length, 1);
  const rotated = [...rest.slice(start), ...rest.slice(0, start)];
  return [primary, ...rotated].slice(0, Math.min(count, POOL.length));
}

/**
 * `count` distinct photographs, with `lead` first.
 *
 * `collegePhotoSet` starts from whatever the pool says is this slug's primary.
 * This starts from a photograph the caller already holds — a programme's own
 * illustration, a university's own art — and fills the remainder from the pool
 * **without ever repeating the lead**.
 *
 * That guarantee is the whole point. Several of the university files are also
 * pool entries, so the obvious `[ownArt, collegePhoto(slug)]` returns the same
 * file twice for any slug whose primary *is* its own art. Two identical frames
 * in a cross-fade is not a subtle bug: it fades from a photograph to itself, so
 * the card looks frozen while the timer runs, and React additionally complains
 * about the duplicate key.
 */
export function photoSetLedBy(lead: string, slug: string, count: number): string[] {
  const others = collegePhotoSet(slug, POOL.length).filter((src) => src !== lead);
  return [lead, ...others].slice(0, count);
}
