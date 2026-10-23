/**
 * A "scope" names one selection from the colleges menu by its filter ("course=MBA"). The admin
 * writes a header for a scope; the colleges page looks one up from the filters in the URL.
 * Earlier keys win when more than one is picked.
 */
export const SCOPE_KEYS = ["ranking_list", "course", "specialisation", "city", "ownership", "level", "mode", "exam", "credential", "approval"] as const;

/** The scope for the filters picked, or undefined when none of them is a menu selection. */
export function scopeFromParams(get: (key: string) => string | undefined): string | undefined {
  for (const key of SCOPE_KEYS) {
    const value = get(key);
    if (value) return `${key}=${value}`;
  }
  return undefined;
}

/** The scope a menu link stands for: "/colleges?course=MBA" is "course=MBA". */
export function scopeOfHref(href: string): string {
  const query = new URLSearchParams(href.split("?")[1] ?? "");
  return scopeFromParams((k) => query.get(k) ?? undefined) ?? "";
}
