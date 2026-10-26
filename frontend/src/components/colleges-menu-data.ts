import { getCollegeFacets, getNavMenuConfig, getRankings, type NavMenuConfig } from "@/lib/api";
import { scopeOfHref } from "@/lib/listing-scope";
import type { MenuGroup } from "@/components/colleges-menu";

const MAX_ITEMS = 24;

/** A link as the directory has it, before the admin's choices are applied. `key` is what the choices are filed under. */
export type SourceItem = { key: string; label: string; href: string };
export type SourceGroup = { id: string; label: string; icon: string; items: SourceItem[] };

const to = (key: string, value: string): SourceItem => ({ key: value, label: value, href: `/colleges?${key}=${encodeURIComponent(value)}` });

/**
 * Every group and link the directory could put in the menu (ranking lists, courses, cities and so
 * on), so a new course or city shows up without a code change. The admin's screen lists these too.
 * If the API is unreachable the groups are empty and the header falls back to a plain link.
 */
export async function getMenuSource(): Promise<SourceGroup[]> {
  const [facets, rankings] = await Promise.all([
    getCollegeFacets().catch(() => null),
    getRankings().catch(() => []),
  ]);

  return [
    {
      id: "ranking", label: "Top Ranked Colleges", icon: "ranking",
      items: rankings.map((l) => ({
        key: l.slug,
        label: l.name.includes(String(l.year)) ? l.name : `${l.name} ${l.year}`,
        href: `/colleges?ranking_list=${encodeURIComponent(l.slug)}`,
      })),
    },
    { id: "course", label: "Popular Courses", icon: "course", items: (facets?.courses ?? []).map((v) => to("course", v)) },
    { id: "specialisation", label: "Popular Specialisations", icon: "specialisation", items: (facets?.specialisations ?? []).map((v) => to("specialisation", v)) },
    { id: "location", label: "Colleges by Location", icon: "location", items: (facets?.cities ?? []).map((v) => to("city", v)) },
    { id: "type", label: "Colleges by Type", icon: "type", items: ["Private", "Government", "Deemed"].map((v) => to("ownership", v)) },
    { id: "level", label: "Colleges by Level", icon: "level", items: ["UG", "PG", "Doctorate"].map((v) => to("level", v)) },
    { id: "mode", label: "Mode of Study", icon: "mode", items: (facets?.modes ?? []).map((v) => to("mode", v)) },
    { id: "exam", label: "Exams Accepted", icon: "exam", items: (facets?.exams ?? []).map((v) => to("exam", v)) },
  ];
}

/** `ids` first, in that order, then whatever is left in its own order. */
export function ordered<T>(list: T[], ids: string[], idOf: (item: T) => string): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]));
  const at = (item: T) => rank.get(idOf(item)) ?? ids.length;
  return list.map((item, i) => ({ item, i })).sort((a, b) => at(a.item) - at(b.item) || a.i - b.i).map((x) => x.item);
}

/** The menu the header shows: the directory's groups with the admin's choices on top. */
export function applyMenuConfig(source: SourceGroup[], config: NavMenuConfig, maxItems = MAX_ITEMS): MenuGroup[] {
  return ordered(source, config.order, (g) => g.id)
    .flatMap((g) => {
      const c = config.groups[g.id];
      if (c?.hidden) return [];
      const items = ordered(g.items, c?.order ?? [], (i) => i.key)
        .filter((i) => !c?.items[i.key]?.hidden)
        .map((i) => ({ label: c?.items[i.key]?.label || i.label, href: i.href }))
        .slice(0, c?.limit || maxItems);
      return items.length > 0 ? [{ label: c?.label || g.label, icon: g.icon, items }] : [];
    });
}

export async function getCollegesMenu(maxItems = MAX_ITEMS): Promise<MenuGroup[]> {
  const [source, config] = await Promise.all([
    getMenuSource(),
    getNavMenuConfig().catch((): NavMenuConfig => ({ order: [], groups: {} })),
  ]);
  return applyMenuConfig(source, config, maxItems);
}

/** The title and description the admin wrote for the selection a /colleges address stands for, if any. */
export function menuSeoFor(config: NavMenuConfig, source: SourceGroup[], href: string): { title: string; description: string } | null {
  const scope = scopeOfHref(href);
  for (const g of source) {
    const item = g.items.find((i) => scopeOfHref(i.href) === scope);
    const c = item && config.groups[g.id]?.items[item.key];
    if (c && (c.seoTitle || c.seoDescription)) return { title: c.seoTitle, description: c.seoDescription };
  }
  return null;
}
