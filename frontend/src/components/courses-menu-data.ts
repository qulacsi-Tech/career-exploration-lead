import { getCourses, getNavMenuConfig, type CourseCatalogue, type NavMenuConfig } from "@/lib/api";
import { applyMenuConfig, EMPTY_NAV, withCollections, type SourceGroup } from "@/components/colleges-menu-data";
import type { MenuGroup } from "@/components/colleges-menu";

/**
 * A course or specialisation the admin can put in a category of the courses menu. `slug` is what the menu
 * saves for it ("course:mba", "spec:finance"); `hint` is the line shown under its name when choosing.
 */
export type CourseLinkOption = { slug: string; title: string; href: string; hint: string };

const listing = (key: string, value: string) => `/courses?${key}=${encodeURIComponent(value)}`;
const distinct = (values: string[]) => [...new Set(values.filter(Boolean))];

/**
 * The courses menu's groups and links as the catalogue has them (popular courses, specialisations, categories,
 * levels, modes and exams), and every course and specialisation that can be added to a category of its own.
 */
export function courseMenuData(courses: CourseCatalogue[]): { directory: SourceGroup[]; options: CourseLinkOption[] } {
  // The priority set in the admin first, then the courses taught at the most colleges.
  const byColleges = [...courses].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity) || b.collegeCount - a.collegeCount || a.name.localeCompare(b.name));
  const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const courseHref = (c: CourseCatalogue) => listing("course", c.name);
  const specHref = (c: CourseCatalogue, name: string) => `/courses?course=${encodeURIComponent(c.name)}&specialisation=${encodeURIComponent(name)}`;

  // One group for each category. In it, each course, then its specialisations under it. Every link opens
  // the courses list with that course (and specialisation) picked, not a course's own page.
  const directory: SourceGroup[] = distinct(courses.map((c) => c.stream)).sort().map((stream) => ({
    id: `cat-${slugOf(stream)}`,
    label: stream,
    icon: "category",
    items: byColleges
      .filter((c) => c.stream === stream)
      .flatMap((c) => [
        { key: c.slug, label: c.name, href: courseHref(c) },
        ...[...(c.specialisations ?? [])]
          .sort((a, b) => b.collegeCount - a.collegeCount || a.name.localeCompare(b.name))
          .map((s) => ({ key: `${c.slug}/${s.slug}`, label: s.name, href: specHref(c, s.name), parent: c.slug })),
      ]),
  })).filter((g) => g.id !== "cat-");

  // What an added category of the menu can hold.
  const specs = new Map<string, { slug: string; courses: string[] }>();
  for (const c of courses) {
    for (const s of c.specialisations ?? []) {
      const seen = specs.get(s.name) ?? { slug: s.slug, courses: [] };
      seen.courses.push(c.name);
      specs.set(s.name, seen);
    }
  }
  const options: CourseLinkOption[] = [
    ...byColleges.map((c) => ({ slug: `course:${c.slug}`, title: c.name, href: courseHref(c), hint: `Course · ${c.level || "—"} · ${c.stream}` })),
    ...[...specs].sort(([a], [b]) => a.localeCompare(b)).map(([name, s]) => ({
      slug: `spec:${s.slug}`, title: name, href: listing("specialisation", name), hint: `Specialisation · ${[...new Set(s.courses)].join(", ")}`,
    })),
  ];
  return { directory, options };
}

export async function getCoursesMenuData() {
  const courses = await getCourses({ limit: 200 }).then((r) => r.data).catch((): CourseCatalogue[] => []);
  return courseMenuData(courses);
}

/** The courses menu the header shows: the catalogue's groups with the admin's choices on top. */
export async function getCoursesMenu(maxItems = 24): Promise<MenuGroup[]> {
  const [{ directory, options }, config] = await Promise.all([
    getCoursesMenuData(),
    getNavMenuConfig("courses").catch((): NavMenuConfig => EMPTY_NAV),
  ]);
  return applyMenuConfig(withCollections(directory, config, options), config, maxItems);
}
