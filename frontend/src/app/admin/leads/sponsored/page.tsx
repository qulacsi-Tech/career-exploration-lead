import { adminSponsoredColleges } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { SponsoredLeads } from "@/components/admin/sponsored-leads";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ q?: string; page?: string }>;

/*
  Server component: one page of the sponsored colleges, searched by the platform API. The search and the page
  live in the URL, so a view can be bookmarked. Marking a college as sponsored is done on its Info tab.
*/
export default async function SponsoredLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, page } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const result = await withAdminToken((token) => adminSponsoredColleges(token, { page: pageNumber, limit: PAGE_SIZE, q: query }));
  return <SponsoredLeads colleges={result.data} meta={result.meta} query={query} />;
}
