import { adminGetCollegePools, adminGetColleges, adminGetGeo, adminGetNavMenuConfig, getCollegeOrNull } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { CollegesAdmin } from "@/components/admin/colleges-admin";
import { EMPTY_NAV, getMenuSource } from "@/components/colleges-menu-data";

/*
  Server component: reads the college list from the admin API with the session
  token, then hands the records to the client table.

  The list endpoint omits placements and cutoffs, which the table's view panel
  shows. Each college is therefore read in detail, in parallel. That is one
  request per row, bounded by the page size of 200. It is the known cost of
  reusing the list shape; an admin list that carries the detail fields would
  remove it.
*/
export default async function AdminCollegesPage() {
  const { data: listed } = await withAdminToken((token) =>
    adminGetColleges(token, { limit: 200 }),
  );
  const colleges = await Promise.all(
    listed.map((college) => getCollegeOrNull(college.slug).then((detail) => detail ?? college)),
  );
  // The state and district lists for the add form. Without them the form falls back to plain text boxes.
  const geo = await withAdminToken((token) => adminGetGeo(token)).catch(() => ({}));
  // The same category list the editor offers, so Add, Edit and the filter agree.
  const pools = await withAdminToken((token) => adminGetCollegePools(token)).catch(() => null);
  // The header-menu links a priority can be set for, with what is already saved on each.
  const nav = await withAdminToken((token) => adminGetNavMenuConfig(token)).catch(() => EMPTY_NAV);
  const source = await getMenuSource(nav);
  const priorityLinks = source.flatMap((g) =>
    g.items.map((i) => ({
      groupId: g.id,
      groupLabel: nav.groups[g.id]?.label || g.label,
      key: i.key,
      label: nav.groups[g.id]?.items[i.key]?.label || i.label,
      href: i.href,
      priority: nav.groups[g.id]?.items[i.key]?.priority ?? {},
    })),
  );
  return <CollegesAdmin colleges={colleges} geo={geo} streams={pools?.streams ?? []} pools={pools} priorityLinks={priorityLinks} />;
}
