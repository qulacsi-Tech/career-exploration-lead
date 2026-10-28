/**
 * Shared shapes and helpers for the listing filter column. Kept out of the
 * client component so server pages can use them too.
 *
 * An option sets one or more URL parameters (a fee band sets both bounds), and
 * a group is single-select: picking an option clears the group's other
 * parameters first.
 */
export type FilterOption = { label: string; params: Record<string, string> };

export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
  /** Parameters of the groups under this one (course under category): changing this group clears them. */
  resets?: string[];
};

/** Single-parameter options: `simple("city", ["Pune"])`. */
export function simple(key: string, values: string[]): FilterOption[] {
  return values.map((v) => ({ label: v, params: { [key]: v } }));
}

export function groupKeys(group: FilterGroup): string[] {
  return [...new Set(group.options.flatMap((o) => Object.keys(o.params)))];
}

export function isOn(option: FilterOption, get: (key: string) => string | null | undefined) {
  return Object.entries(option.params).every(([k, v]) => get(k) === v);
}

/** The URL that results from picking `option` (or clearing it, if already on). */
export function toggleHref(
  base: string,
  search: URLSearchParams,
  group: FilterGroup,
  option: FilterOption,
) {
  const next = new URLSearchParams(search.toString());
  const wasOn = isOn(option, (k) => next.get(k));
  next.delete("page");
  for (const key of [...groupKeys(group), ...(group.resets ?? [])]) next.delete(key);
  if (!wasOn) for (const [k, v] of Object.entries(option.params)) next.set(k, v);
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

/** One applied-filter chip per group that has a selection, with the URL that clears it. */
export function appliedFilters(
  base: string,
  groups: FilterGroup[],
  search: URLSearchParams,
): { id: string; label: string; clear: string }[] {
  const out: { id: string; label: string; clear: string }[] = [];
  for (const group of groups) {
    const on = group.options.find((o) => isOn(o, (k) => search.get(k)));
    if (!on) continue;
    const next = new URLSearchParams(search.toString());
    next.delete("page");
    for (const key of [...groupKeys(group), ...(group.resets ?? [])]) next.delete(key);
    const qs = next.toString();
    out.push({ id: group.id, label: on.label, clear: qs ? `${base}?${qs}` : base });
  }
  return out;
}

/** The address with every narrowing parameter removed: what is left is the sort and nothing that filters. */
export function withoutFilters(groups: FilterGroup[], search: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(search.toString());
  const keys = new Set([...groups.flatMap(groupKeys), "q", "ranking_max", "min_rating", "collection", "menu", "page"]);
  for (const key of keys) next.delete(key);
  return next;
}
