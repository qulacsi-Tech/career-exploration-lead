import { adminExamLeads } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { ExamLeadsTable } from "@/components/admin/exam-leads";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ q?: string; page?: string; exam?: string }>;

/*
  Server component: the students who sat practice tests, one row for each student and exam, a page at a time. The
  search, the exam filter and the page live in the URL, so a view can be bookmarked.
*/
export default async function ExamLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, page, exam } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const examSlug = (exam ?? "").trim().slice(0, 200);
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const result = await withAdminToken((token) => adminExamLeads(token, { page: pageNumber, limit: PAGE_SIZE, q: query, exam: examSlug }));
  return <ExamLeadsTable rows={result.items} meta={result.meta} exams={result.exams} query={query} exam={examSlug} />;
}
