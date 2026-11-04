import { adminListQuestions } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { QuestionsAdmin } from "@/components/admin/questions-admin";

/*
  Server component: every question students have sent. The platform team sees all colleges; a college admin sees
  only their own. The API says which (`role`), and the screen offers only what that person may do: either can
  answer, and only the platform team approves a question for the college's Q&A page.
*/
export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = params.college;
  const college = (Array.isArray(raw) ? raw[0] : raw) || undefined;
  const { role, items } = await withAdminToken((token) => adminListQuestions(token));
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Questions"
        description={
          role === "experts"
            ? "Questions and concerns from students. Answer them as Career Experts, and approve the good ones to show on the college's Q&A page."
            : "Questions and concerns students sent to your college. Your answer is shown as coming from the college once the platform team approves it for the Q&A page."
        }
      />
      <QuestionsAdmin role={role} items={items} initialCollege={college} />
    </div>
  );
}
