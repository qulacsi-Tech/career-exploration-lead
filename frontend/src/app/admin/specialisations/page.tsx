import { adminGetCatalogue, type AdminSpecialisation } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { SpecialisationsAdmin } from "@/components/admin/specialisations-admin";

/*
  Server component: flattens the catalogue's nested specialisations into one list
  for the editor, and passes the courses so a specialisation can pick its parent.
*/
export default async function AdminSpecialisationsPage() {
  const courses = await withAdminToken((token) => adminGetCatalogue(token));
  const specialisations: AdminSpecialisation[] = courses.flatMap((course) => course.specialisations);
  return <SpecialisationsAdmin specialisations={specialisations} courses={courses} />;
}
