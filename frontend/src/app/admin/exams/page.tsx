import { exams } from "@/lib/mock-data";
import { ExamsAdmin } from "@/components/admin/exams-admin";

export default function AdminExamsPage() {
  return <ExamsAdmin exams={exams} />;
}
