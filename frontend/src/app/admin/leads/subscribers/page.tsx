import { adminSubscribers } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { SubscribersTable } from "@/components/admin/subscribers-table";

const PAGE_SIZE = 20;

type SearchParams = Promise<{ q?: string; page?: string; status?: string }>;

/*
  Server component: one page of the emails entered in the site footer's Subscribe box, searched and filtered by
  the API. The search, filter and page live in the URL, so a view can be bookmarked.
*/
export default async function SubscribersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, page, status } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const filter = status === "active" || status === "unsubscribed" ? status : "";
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const result = await withAdminToken((token) => adminSubscribers(token, { page: pageNumber, limit: PAGE_SIZE, q: query, status: filter }));
  return <SubscribersTable subscribers={result.data} meta={result.meta} query={query} status={filter} />;
}
