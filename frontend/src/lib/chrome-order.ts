import type { HeaderLinkId, SiteChrome } from "@/lib/api";

/*
  The pure part of the header and footer arrangement: names, defaults and ordering. No fetching, so the
  admin screen (a client component) can use it without pulling the API client into the browser.
*/

export type FooterColumn = { title: string; links: { label: string; href: string }[] };

/** What the header's links go to. Their wording and order come from the admin; these never change. */
export const HEADER_HREF: Record<HeaderLinkId, string> = {
  courses: "/courses",
  colleges: "/colleges",
  compare: "/compare",
  news: "/articles",
};

export const HEADER_DEFAULT_LABEL: Record<HeaderLinkId, string> = {
  courses: "Courses",
  colleges: "Top Ranked Colleges",
  compare: "Compare",
  news: "News",
};

export const CHROME_DEFAULTS: SiteChrome = {
  headerLogo: { image: "", text: "", alt: "" },
  footerLogo: { image: "", text: "", alt: "" },
  headerItems: (Object.keys(HEADER_HREF) as HeaderLinkId[]).map((id) => ({ id, label: HEADER_DEFAULT_LABEL[id], hidden: false })),
  footerColumnOrder: [],
  footerLinkOrder: {},
};

/** `items` in the saved order of their keys; whatever the order does not name keeps its own order, after. */
export function inSavedOrder<T>(items: T[], saved: string[] | undefined, keyOf: (item: T) => string): T[] {
  if (!saved || saved.length === 0) return items;
  const rank = new Map(saved.map((k, i) => [k, i]));
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (rank.get(keyOf(a.item)) ?? saved.length) - (rank.get(keyOf(b.item)) ?? saved.length) || a.i - b.i)
    .map((x) => x.item);
}

/** The footer's columns and their links in the order the admin set. */
export function arrangeFooter(columns: FooterColumn[], chrome: SiteChrome): FooterColumn[] {
  return inSavedOrder(columns, chrome.footerColumnOrder, (c) => c.title).map((c) => ({
    ...c,
    links: inSavedOrder(c.links, chrome.footerLinkOrder[c.title], (l) => l.href),
  }));
}
