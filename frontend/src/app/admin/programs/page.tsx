import { adminGetCatalogue, adminGetColleges, adminListPrograms } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ProgramsAdmin } from "@/components/admin/programs-admin";

/*
  Server component: every programme record and the homepage row, from the admin
  API with the session token.
*/
export default async function AdminProgramsPage() {
  const [{ programs, recommended, courses }, colleges, catalogue] = await withAdminToken((token) =>
    Promise.all([
      adminListPrograms(token),
      // The directory's colleges, for the university picker. Without them the picker still takes a typed name.
      adminGetColleges(token, { limit: 100 }).then((r) => r.data).catch(() => []),
      // The catalogue's courses and specialisations, which a programme is chosen from.
      adminGetCatalogue(token).catch(() => ({ courses: [], specialisations: [] })),
    ]),
  );
  return (
    <ProgramsAdmin
      programs={programs}
      recommendedSlugs={recommended}
      colleges={colleges.map((c) => ({ slug: c.slug, name: c.name, city: c.city }))}
      catalogue={{
        courses: catalogue.courses.map((c) => ({ name: c.name, slug: c.slug })),
        specialisations: catalogue.specialisations.map((s) => ({ name: s.name, courseSlugs: s.courseSlugs })),
      }}
      sourceCourses={courses}
    />
  );
}
