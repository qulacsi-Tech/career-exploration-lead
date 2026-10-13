import { adminGetColleges, adminListPrograms } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ProgramsAdmin } from "@/components/admin/programs-admin";

/*
  Server component: every programme record and the homepage row, from the admin
  API with the session token.
*/
export default async function AdminProgramsPage() {
  const [{ programs, recommended }, colleges] = await withAdminToken((token) =>
    Promise.all([
      adminListPrograms(token),
      // The directory's colleges, for the university picker. Without them the picker still takes a typed name.
      adminGetColleges(token, { limit: 100 }).then((r) => r.data).catch(() => []),
    ]),
  );
  return (
    <ProgramsAdmin
      programs={programs}
      recommendedSlugs={recommended}
      colleges={colleges.map((c) => ({ slug: c.slug, name: c.name, city: c.city }))}
    />
  );
}
