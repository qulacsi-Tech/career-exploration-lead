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
  | "exams"
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
    // Colleges and the ways they are grouped and ordered. A collection owns a URL, and a ranking list
    // orders colleges, so both sit with the colleges themselves.
    id: "colleges",
    label: "Colleges",
    icon: "sections",
    items: [
      { label: "All Colleges", href: "/admin/colleges", phase: 1 },
      { label: "Collections", href: "/admin/collections", phase: 1 },
      { label: "Rankings", href: "/admin/rankings", phase: 1 },
    ],
  },
  {
    // What a college teaches: the degree list its form picks from, and the online offerings colleges entered.
    id: "courses",
    label: "Courses",
    icon: "content",
    items: [
      // Categories, Courses and Specialisations: the three lists the college form picks from.
      { label: "Catalogue", href: "/admin/catalogue", phase: 1 },
      // The online courses colleges entered on their own records, to switch on or off. Not the degree list (Catalogue).
      { label: "Online Programmes", href: "/admin/programs", phase: 1 },
      // Switched off for now; the pages are kept.
      // { label: "Study Abroad", href: "/admin/study-abroad", phase: 1 },
      // { label: "Location Page", href: "/admin/sections/location", phase: 1 },
    ],
  },
  // On its own: entrance exams are not part of a college or a course, so they get no group.
  { id: "exams", label: "Exams", icon: "exams", single: true, items: [{ label: "Exams", href: "/admin/exams", phase: 1 }] },
  {
    // What visitors read and navigate by: the homepage, the header menu, news and the sign in pages.
    id: "website",
    label: "Website",
    icon: "seo",
    items: [
      { label: "Homepage", href: "/admin/sections/homepage", phase: 1 },
      // The header's "Top Ranked Colleges" menu: which categories and links show, their names and SEO.
      { label: "Navigation", href: "/admin/sections/navigation", phase: 1 },
      { label: "News", href: "/admin/news", phase: 1 },
      // The words and the picture on the log in and sign up pages.
      { label: "Login & Signup", href: "/admin/auth-pages", phase: 1 },
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
    id: "activity",
    label: "Activity",
    icon: "community",
    items: [
      { label: "Questions", href: "/admin/questions", phase: 1 },
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
      { label: "Questions", href: "/admin/questions", phase: 1 },
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
