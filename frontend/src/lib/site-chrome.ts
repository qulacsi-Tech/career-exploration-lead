import { getSiteChrome, type HeaderItemConfig, type SiteChrome } from "@/lib/api";
import { CHROME_DEFAULTS, HEADER_DEFAULT_LABEL, HEADER_HREF } from "@/lib/chrome-order";

export { CHROME_DEFAULTS, HEADER_DEFAULT_LABEL, HEADER_HREF, inSavedOrder } from "@/lib/chrome-order";

/** The arrangement, or the plain default when the API cannot be reached. Never throws. */
export async function loadSiteChrome(): Promise<SiteChrome> {
  return (await getSiteChrome().catch(() => null)) ?? CHROME_DEFAULTS;
}

/** The header links to show, in the admin's order, minus any switched off. */
export function visibleHeaderItems(chrome: SiteChrome): (HeaderItemConfig & { href: string })[] {
  return chrome.headerItems.filter((i) => !i.hidden && i.id in HEADER_HREF).map((i) => ({ ...i, label: i.label || HEADER_DEFAULT_LABEL[i.id], href: HEADER_HREF[i.id] }));
}
