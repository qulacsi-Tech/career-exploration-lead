import { getCollectionLinks, getCollegeFacets, getNavMenuConfig, getRankings, type NavCustomGroup, type NavMenuConfig } from "@/lib/api";
import { scopeOfHref } from "@/lib/listing-scope";
import type { MenuGroup } from "@/components/colleges-menu";

const MAX_ITEMS = 24;

/** A link as the directory has it, before the admin's choices are applied. `key` is what the choices are filed under. */
/** `collection` marks a link the admin added: a collection, not something the directory holds. */
/** `parent` is the key of the link this one sits under in its group (a specialisation under its course). */
export type SourceItem = { key: string; label: string; href: string; collection?: boolean; parent?: string };
/** `custom` marks a category the admin added; its links are collections, not directory facets. */
export type SourceGroup = { id: string; label: string; icon: string; items: SourceItem[]; custom?: boolean };

export const EMPTY_NAV: NavMenuConfig = { order: [], groups: {}, custom: [] };

type CollectionLink = { slug: string; title: string; href: string };

/** The links for these collections, in this order. A collection that is no longer published is left out. */
function collectionItems(slugs: string[], links: CollectionLink[]): SourceItem[] {
  return slugs.flatMap((slug) => {
    const link = links.find((l) => l.slug === slug);
    return link ? [{ key: slug, label: link.title, href: link.href, collection: true }] : [];
  });
}

/** The directory's groups with the collections the admin added to them (first), then the categories the admin made. */
export function withCollections(directory: SourceGroup[], config: NavMenuConfig, links: CollectionLink[]): SourceGroup[] {
  return [
    ...directory.map((g) => ({ ...g, items: [...collectionItems(config.groups[g.id]?.collections ?? [], links), ...g.items] })),
    ...customSource(config.custom, links),
  ];
}

/** The categories the admin added, each with the collections it holds. */
export function customSource(custom: NavCustomGroup[], links: CollectionLink[]): SourceGroup[] {
  return custom.map((c) => ({
    id: c.id,
    label: c.label,
    icon: "collection",
    custom: true,
    items: collectionItems(c.collections, links),
  }));
}

const to = (key: string, value: string): SourceItem => ({ key: value, label: value, href: `/colleges?${key}=${encodeURIComponent(value)}` });

/**
 * Every group and link the directory could put in the menu (ranking lists, courses, cities and so
 * on), so a new course or city shows up without a code change. The admin's screen lists these too.
 * If the API is unreachable the groups are empty and the header falls back to a plain link.
 */
export async function getMenuSource(config: NavMenuConfig = EMPTY_NAV, withCustom = true): Promise<SourceGroup[]> {
  const hasCollections = config.custom.length > 0 || Object.values(config.groups).some((g) => g.collections.length > 0);
  const [facets, rankings, links] = await Promise.all([
    getCollegeFacets().catch(() => null),
    getRankings().catch(() => []),
    withCustom && hasCollections ? getCollectionLinks().catch(() => []) : Promise.resolve([]),
  ]);

  const directory: SourceGroup[] = [
    {
      id: "ranking", label: "Top Ranked Colleges", icon: "ranking",
      items: rankings.map((l) => ({
        key: l.slug,
        // The short name when the admin gave one, so a long list name does not get cut off in the menu.
        label: l.shortName?.trim() || (l.name.includes(String(l.year)) ? l.name : `${l.name} ${l.year}`),
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
  // Collections the admin put in a category (here, or in Content > Collections) sit with its other links.
  return withCustom ? withCollections(directory, config, links) : directory;
}

/** `ids` first, in that order, then whatever is left in its own order. */
export function ordered<T>(list: T[], ids: string[], idOf: (item: T) => string): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]));
  const at = (item: T) => rank.get(idOf(item)) ?? ids.length;
  return list.map((item, i) => ({ item, i })).sort((a, b) => at(a.item) - at(b.item) || a.i - b.i).map((x) => x.item);
}

/** A link that leaves institutes out, or puts some first, carries which link it is, so the listing it opens can do the same. */
function withMenuMark(href: string, group: string, key: string, item: { excluded?: string[]; priority?: Record<string, number> } | undefined): string {
  if (!item || ((item.excluded ?? []).length === 0 && Object.keys(item.priority ?? {}).length === 0)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}menu=${encodeURIComponent(`${group}:${key}`)}`;
}

/** The menu the header shows: the directory's groups with the admin's choices on top. */
export function applyMenuConfig(source: SourceGroup[], config: NavMenuConfig, maxItems = MAX_ITEMS): MenuGroup[] {
  return ordered(source, config.order, (g) => g.id)
    .flatMap((g) => {
      const c = config.groups[g.id];
      if (c?.hidden) return [];
      const shape = (i: SourceItem) => ({ label: c?.items[i.key]?.label || i.label, href: withMenuMark(i.href, g.id, i.key, c?.items[i.key]) });
      // A link under another one goes when its parent goes.
      const shown = ordered(g.items, c?.order ?? [], (i) => i.key).filter((i) => !c?.items[i.key]?.hidden && !(i.parent && c?.items[i.parent]?.hidden));
      const isChild = (i: SourceItem) => Boolean(i.parent && g.items.some((p) => p.key === i.parent));
      const items = shown
        .filter((i) => !isChild(i))
        .slice(0, c?.limit || maxItems)
        .map((i) => {
          const children = shown.filter((child) => child.parent === i.key).map(shape);
          return children.length > 0 ? { ...shape(i), children } : shape(i);
        });
      return items.length > 0 ? [{ label: c?.label || g.label, icon: g.icon, items }] : [];
    });
}

export async function getCollegesMenu(maxItems = MAX_ITEMS): Promise<MenuGroup[]> {
  const config = await getNavMenuConfig().catch((): NavMenuConfig => EMPTY_NAV);
  return applyMenuConfig(await getMenuSource(config), config, maxItems);
}

/** The title and description the admin wrote for the selection a /colleges address stands for, if any. */
export function menuSeoFor(config: NavMenuConfig, source: SourceGroup[], href: string): { title: string; description: string } | null {
  const scope = scopeOfHref(href);
  if (!scope) return null;
  for (const g of source) {
    const item = g.items.find((i) => scopeOfHref(i.href) === scope);
    const c = item && config.groups[g.id]?.items[item.key];
    if (c && (c.seoTitle || c.seoDescription)) return { title: c.seoTitle, description: c.seoDescription };
  }
  return null;
}
