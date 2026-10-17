import { adminListLeads, collegeListLeads, getMe, LEAD_STATUSES, type LeadStatus } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { isCollegeAdmin } from "@/lib/roles";
import { LeadsInbox } from "@/components/admin/leads-inbox";

const PAGE_SIZE = 25;

type SearchParams = Promise<{ status?: string; page?: string }>;

/*
  Server component: reads one page of leads, filtered by status, through the admin
  API with the session token. The status and page live in the URL, so a filtered
  view can be bookmarked and shared inside the team.
*/
export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, page } = await searchParams;
  const filter = (LEAD_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as LeadStatus)
    : undefined;
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  // A college admin's inbox is their own college's leads, read through the college endpoint.
  const result = await withAdminToken(async (token) => {
    const me = await getMe(token);
    const forCollege = isCollegeAdmin(me.role);
    const list = forCollege ? collegeListLeads : adminListLeads;
    const page = await list(token, { status: filter, page: pageNumber, limit: PAGE_SIZE });
    return { ...page, scope: forCollege ? ("college" as const) : ("platform" as const) };
  });

  return <LeadsInbox leads={result.data} meta={result.meta} status={filter} scope={result.scope} />;
}
