/**
 * The admin panel's navigation model: sections, each holding sub-sections.
 *
 * Data rather than markup so the sidebar, the mobile drawer and the breadcrumb
 * all read the same source — three places that otherwise drift the moment a
 * module is added.
 *
 * The modules come from the delivery scope in
 * assets/prototype/College-Discovery-Platform-Proposal.md: Phase 1 is the core
 * CMS, leads inbox and SEO tooling; Phase 2 adds reviews, Q&A and the richer
 * content modules. `phase` is carried here so the UI can mark what is not in
 * the current build rather than presenting dead links as if they were ready.
 */
export type AdminNavItem = {
  label: string;
  href: string;
  /** Delivery phase from the proposal; 2 renders as "later" in the sidebar. */
  phase?: 1 | 2 | 3;
};

/**
 * Icon is a key, not a component, so this stays a plain data module — the
 * sidebar maps keys to SVGs. Keeping JSX out of here means the nav model can be
 * imported by anything (breadcrumbs, tests) without pulling in React.
 */
export type AdminNavIcon =
  | "overview"
  | "content"
  | "sections"
  | "leads"
  | "community"
  | "seo"
  | "settings";

export type AdminNavSection = {
  /** Stable id, also used to key the section's open/closed state. */
  id: string;
  label: string;
  icon: AdminNavIcon;
  items: AdminNavItem[];
  /** A section with one item that is shown as a plain link, with no group around it. */
  single?: boolean;
};

/*
  Left out until their pages exist, so no sidebar link leads to a 404: Community
  (Reviews, Questions & Answers), SEO (Metadata, Redirects, Sitemaps), and Content
  → Locations and Static Pages. All are in the client's proposal; add each back
  with its page. The "community" and "seo" icons are kept for that.
*/
export const adminNav: AdminNavSection[] = [
  // On its own: the first thing an admin opens, so it is not folded into a group.
  { id: "dashboard", label: "Dashboard", icon: "overview", single: true, items: [{ label: "Dashboard", href: "/admin", phase: 1 }] },
  {
    // What visitors see and browse: the college listings, the groups of colleges, articles, the homepage
    // and the header menu. The things edited most often come first.
    id: "listings",
    label: "Listings & Pages",
    icon: "sections",
    items: [
      { label: "Colleges", href: "/admin/colleges", phase: 1 },
      /*
        A collection owns a URL, so it sits with the listings rather than inside the Homepage screen
        (it was the "College bands" tab there, which only made sense while a band was the only thing a
        group of colleges could be).
      */
      { label: "Collections", href: "/admin/collections", phase: 1 },
      { label: "Articles", href: "/admin/articles", phase: 1 },
      { label: "Homepage", href: "/admin/sections/homepage", phase: 1 },
      // The header's "Top Ranked Colleges" menu: which categories and links show, their names and SEO.
      { label: "Navigation", href: "/admin/sections/navigation", phase: 1 },
    ],
  },
  {
    // The reference data the listings are built from: what colleges are described with, the entrance
    // exams, the ranking lists, and the online offerings colleges have entered.
    id: "content",
    label: "Content",
    icon: "content",
    items: [
      // Categories, Courses and Specialisations: the three lists the college form picks from.
      { label: "Catalogue", href: "/admin/catalogue", phase: 1 },
      { label: "Exams", href: "/admin/exams", phase: 1 },
      { label: "Rankings", href: "/admin/rankings", phase: 1 },
      // The online courses colleges entered on their own records, to switch on or off. Not the degree list (Catalogue).
      { label: "Online Programmes", href: "/admin/programs", phase: 1 },
      // Switched off for now; the pages are kept.
      // { label: "Study Abroad", href: "/admin/study-abroad", phase: 1 },
      // { label: "Location Page", href: "/admin/sections/location", phase: 1 },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    icon: "leads",
    items: [
      { label: "Inbox", href: "/admin/leads", phase: 1 },
      { label: "Visitor Analytics", href: "/admin/analytics", phase: 1 },
    ],
  },
  {
    id: "overview",
    label: "Overview",
    icon: "community",
    items: [
      { label: "Approvals", href: "/admin/approvals", phase: 1 },
      { label: "Messages", href: "/admin/messages", phase: 1 },
      { label: "Notifications", href: "/admin/notifications", phase: 1 },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    items: [
      { label: "Users & Roles", href: "/admin/users", phase: 1 },
      // Switched off for now; the page is kept.
      // { label: "Site Settings", href: "/admin/settings", phase: 1 },
    ],
  },
];

/**
 * What a college admin sees: their own college, and the enquiries sent to it. Nothing else exists
 * for them. The proxy sends them back to the dashboard if they type another admin address.
 */
export const collegeAdminNav: AdminNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "overview",
    items: [
      { label: "Dashboard", href: "/admin", phase: 1 },
      { label: "Notifications", href: "/admin/notifications", phase: 1 },
    ],
  },
  {
    id: "content",
    label: "My college",
    icon: "content",
    items: [
      { label: "College record", href: "/admin/college", phase: 1 },
      { label: "My requests", href: "/admin/requests", phase: 1 },
      { label: "Messages", href: "/admin/messages", phase: 1 },
    ],
  },
  { id: "leads", label: "Leads", icon: "leads", items: [{ label: "Inbox", href: "/admin/leads", phase: 1 }] },
];

/**
 * Longest-prefix match, so /admin/leads/forms highlights Enquiry Forms rather
 * than Inbox. "/admin" is exact-only — every route starts with it.
 */
export function findActiveItem(pathname: string, nav: AdminNavSection[] = adminNav) {
  let best: { section: AdminNavSection; item: AdminNavItem } | null = null;

  for (const section of nav) {
    for (const item of section.items) {
      const matches =
        item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
      if (matches && (!best || item.href.length > best.item.href.length)) {
        best = { section, item };
      }
    }
  }

  return best;
}
