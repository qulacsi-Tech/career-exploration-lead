import { notFound } from "next/navigation";
import { ApiError, adminExamLeadDetail } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ExamLeadDetailView } from "@/components/admin/exam-leads";

/* One student's attempts on one exam: who they are, and every attempt with its score and sections. */
export default async function ExamLeadDetailPage({ params }: { params: Promise<{ user: string; exam: string }> }) {
  const { user, exam } = await params;
  const detail = await withAdminToken((token) => adminExamLeadDetail(token, user, exam)).catch((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) return null;
    throw err;
  });
  if (!detail) notFound();
  return <ExamLeadDetailView detail={detail} />;
}
