import { notFound } from "next/navigation";
import { adminSavedColleges, adminSavedStudents, getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { isCollegeAdmin } from "@/lib/roles";
import { SavedStudentsTable } from "@/components/admin/saved-leads";

const PAGE_SIZE = 20;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string }> };

/* Platform team only: the students who saved one college. A college admin has their own list on the page above. */
export default async function SavedStudentsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const result = await withAdminToken(async (token) => {
    const me = await getMe(token);
    if (isCollegeAdmin(me.role)) return null;
    const [students, named] = await Promise.all([
      adminSavedStudents(token, slug, { page: pageNumber, limit: PAGE_SIZE, q: query }),
      adminSavedColleges(token, { limit: 5, q: slug.replace(/-/g, " ") }).catch(() => null),
    ]);
    return { students, name: named?.data.find((c) => c.slug === slug)?.name ?? slug };
  });
  if (!result) notFound();

  return (
    <SavedStudentsTable
      students={result.students.data}
      meta={result.students.meta}
      query={query}
      base={`/admin/leads/saved/${encodeURIComponent(slug)}`}
      title={result.name}
      description="Students who saved this college to their profile."
      back={{ href: "/admin/leads/saved", label: "All saved institutes" }}
      showConsent
    />
  );
}
