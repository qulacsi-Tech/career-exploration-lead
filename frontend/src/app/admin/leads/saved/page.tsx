import { adminSavedColleges, collegeSavedStudents, getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { isCollegeAdmin } from "@/lib/roles";
import { SavedCollegesTable, SavedStudentsTable } from "@/components/admin/saved-leads";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ q?: string; page?: string }>;

/*
  Server component. The platform team sees every saved college with how many students saved it. A college admin sees
  the students who saved their own college (those who agreed to be contacted). The search and the page live in the URL.
*/
export default async function SavedInstitutesPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const result = await withAdminToken(async (token) => {
    const me = await getMe(token);
    if (isCollegeAdmin(me.role)) return { kind: "college" as const, ...(await collegeSavedStudents(token, { page: pageNumber, limit: PAGE_SIZE, q: query })) };
    return { kind: "platform" as const, ...(await adminSavedColleges(token, { page: pageNumber, limit: PAGE_SIZE, q: query })) };
  });

  if (result.kind === "college") {
    return (
      <SavedStudentsTable
        students={result.items}
        meta={result.meta}
        query={query}
        base="/admin/leads/saved"
        title="Students who saved your college"
        description="Students who pressed Save on your college page and agreed to be contacted."
        notShared={result.notShared}
      />
    );
  }
  return <SavedCollegesTable colleges={result.data} meta={result.meta} query={query} />;
}
