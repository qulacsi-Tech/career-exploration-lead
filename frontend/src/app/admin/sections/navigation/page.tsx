import { adminGetNavMenuConfig } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { getMenuSource } from "@/components/colleges-menu-data";
import { NavMenuAdmin } from "@/components/admin/nav-menu-admin";

/*
  Server component: the directory's own groups and links (what the menu could show) and the
  admin's saved choices on top of them.
*/
export default async function AdminNavigationPage() {
  const [source, config] = await Promise.all([getMenuSource(), withAdminToken((token) => adminGetNavMenuConfig(token))]);
  return <NavMenuAdmin source={source} initial={config} />;
}
