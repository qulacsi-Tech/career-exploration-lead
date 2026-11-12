import { adminGetExams } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ExamsAdmin } from "@/components/admin/exams-admin";

/*
  The admin list reads its own endpoint, not the public one: it also returns archived exams
  (hidden from the site) so they can be restored. The admin layout has already checked the session.
*/
export default async function AdminExamsPage() {
  const exams = await withAdminToken((token) => adminGetExams(token));
  return <ExamsAdmin exams={exams} />;
}
