import { adminGetColleges, adminGetGeo, getCollegeOrNull } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { CollegesAdmin } from "@/components/admin/colleges-admin";

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
  return <CollegesAdmin colleges={colleges} geo={geo} />;
}
