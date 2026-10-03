import { adminGetCatalogue } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { CoursesAdmin } from "@/components/admin/courses-admin";

/*
  Server component: reads every course, published or not, through the admin API
  with the session token. Specialisations are edited on their own page.
*/
export default async function AdminCoursesPage() {
  const courses = await withAdminToken((token) => adminGetCatalogue(token));
  return <CoursesAdmin courses={courses} />;
}
