import { getExams } from "@/lib/api";
import { ExamsAdmin } from "@/components/admin/exams-admin";

/*
  The exam list is public, so this reads the same endpoint the site does. The
  admin layout has already checked the session.
*/
export default async function AdminExamsPage() {
  const { data } = await getExams({ limit: 100 });
  return <ExamsAdmin exams={data} />;
}
