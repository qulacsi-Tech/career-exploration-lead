import { adminGetNavMenuConfig, getCollectionLinks } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { EMPTY_NAV, getMenuSource } from "@/components/colleges-menu-data";
import { NavMenuAdmin } from "@/components/admin/nav-menu-admin";

/*
  Server component: the directory's own groups and links (what the menu could show), every published
  collection (what an added category can hold), and the admin's saved choices on top of them. The
  added categories are built in the browser from the choices, so they change as they are edited.
*/
export default async function AdminNavigationPage() {
  const [source, links, config] = await Promise.all([
    getMenuSource(EMPTY_NAV, false),
    getCollectionLinks().catch(() => []),
    withAdminToken((token) => adminGetNavMenuConfig(token)),
  ]);
  return <NavMenuAdmin source={source} links={links} initial={config} />;
}
