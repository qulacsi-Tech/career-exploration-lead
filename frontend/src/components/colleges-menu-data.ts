import { getCollegeFacets, getRankings } from "@/lib/api";
import type { MenuGroup } from "@/components/colleges-menu";

const MAX_ITEMS = 24;

const to = (key: string, value: string) => ({ label: value, href: `/colleges?${key}=${encodeURIComponent(value)}` });

/**
 * The groups under "Top Ranked Colleges", built from what the directory holds (ranking lists, courses,
 * cities and so on), so a new course or city shows up in the menu without a code change. If the API is
 * unreachable the menu is empty and the header falls back to a plain link.
 */
export async function getCollegesMenu(maxItems = MAX_ITEMS): Promise<MenuGroup[]> {
  const [facets, rankings] = await Promise.all([
    getCollegeFacets().catch(() => null),
    getRankings().catch(() => []),
  ]);

  const groups: MenuGroup[] = [
    {
      label: "Top Ranked Colleges", icon: "ranking",
      items: rankings.map((l) => ({
        label: l.name.includes(String(l.year)) ? l.name : `${l.name} ${l.year}`,
        href: `/colleges?ranking_list=${encodeURIComponent(l.slug)}`,
      })),
    },
    { label: "Popular Courses", icon: "course", items: (facets?.courses ?? []).map((v) => to("course", v)) },
    { label: "Popular Specialisations", icon: "specialisation", items: (facets?.specialisations ?? []).map((v) => to("specialisation", v)) },
    { label: "Colleges by Location", icon: "location", items: (facets?.cities ?? []).map((v) => to("city", v)) },
    { label: "Colleges by Type", icon: "type", items: ["Private", "Government", "Deemed"].map((v) => to("ownership", v)) },
    { label: "Colleges by Level", icon: "level", items: ["UG", "PG", "Doctorate"].map((v) => to("level", v)) },
    { label: "Mode of Study", icon: "mode", items: (facets?.modes ?? []).map((v) => to("mode", v)) },
    { label: "Exams Accepted", icon: "exam", items: (facets?.exams ?? []).map((v) => to("exam", v)) },
  ];

  return groups
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, items: g.items.slice(0, maxItems) }));
}
