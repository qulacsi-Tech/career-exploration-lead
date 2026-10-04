import { adminListPrograms } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ProgramsAdmin } from "@/components/admin/programs-admin";

/*
  Server component: every programme record and the homepage row, from the admin
  API with the session token.
*/
export default async function AdminProgramsPage() {
  const { programs, recommended } = await withAdminToken((token) => adminListPrograms(token));
  return <ProgramsAdmin programs={programs} recommendedSlugs={recommended} />;
}
