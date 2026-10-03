import { adminGetStudyAbroad } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { StudyAbroadAdmin } from "@/components/admin/study-abroad-admin";

/*
  Server component: reads every study-abroad row, with its id, through the admin
  API using the session token. The editor then creates, changes and deletes rows.
*/
export default async function AdminStudyAbroadPage() {
  const content = await withAdminToken((token) => adminGetStudyAbroad(token));
  return <StudyAbroadAdmin content={content} />;
}
