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
};

export const adminNav: AdminNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "overview",
    items: [{ label: "Dashboard", href: "/admin", phase: 1 }],
  },
  {
    id: "content",
    label: "Content",
    icon: "content",
    items: [
      { label: "Colleges", href: "/admin/colleges", phase: 1 },
      { label: "Courses", href: "/admin/courses", phase: 1 },
      { label: "Specialisations", href: "/admin/specialisations", phase: 1 },
      { label: "Exams", href: "/admin/exams", phase: 1 },
      { label: "Rankings", href: "/admin/rankings", phase: 1 },
      { label: "Locations", href: "/admin/locations", phase: 1 },
      { label: "Articles", href: "/admin/articles", phase: 2 },
      { label: "Static Pages", href: "/admin/pages", phase: 1 },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    icon: "leads",
    items: [
      { label: "Inbox", href: "/admin/leads", phase: 1 },
      { label: "Enquiry Forms", href: "/admin/leads/forms", phase: 1 },
      { label: "Integrations", href: "/admin/leads/integrations", phase: 2 },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: "community",
    items: [
      { label: "Reviews", href: "/admin/reviews", phase: 2 },
      { label: "Questions & Answers", href: "/admin/questions", phase: 2 },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    icon: "seo",
    items: [
      { label: "Metadata", href: "/admin/seo", phase: 1 },
      { label: "Redirects", href: "/admin/seo/redirects", phase: 1 },
      { label: "Sitemaps", href: "/admin/seo/sitemaps", phase: 1 },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    items: [
      { label: "Users & Roles", href: "/admin/users", phase: 1 },
      { label: "Site Settings", href: "/admin/settings", phase: 1 },
    ],
  },
];

/**
 * Longest-prefix match, so /admin/leads/forms highlights Enquiry Forms rather
 * than Inbox. "/admin" is exact-only — every route starts with it.
 */
export function findActiveItem(pathname: string) {
  let best: { section: AdminNavSection; item: AdminNavItem } | null = null;

  for (const section of adminNav) {
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
