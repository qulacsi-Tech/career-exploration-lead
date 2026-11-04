import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { ApprovalsTable } from "@/components/admin/approvals-table";
import { adminListRequests } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const TABS = [
  { value: "pending", label: "Waiting" },
  { value: "decided", label: "Decided" },
  { value: "all", label: "All" },
] as const;

/*
  The queue of changes college admins have sent for approval. Oldest waiting first, so nothing sits at
  the bottom. Anyone on the platform team can review one; the first decision stands.
*/
export default async function ApprovalsPage({ searchParams }: PageProps<"/admin/approvals">) {
  const params = await searchParams;
  const raw = first(params.status);
  const status = raw === "decided" || raw === "all" ? raw : "pending";
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const { data, meta } = await withAdminToken((token) => adminListRequests(token, { status, page, limit: 100 }));
  const href = (nextPage: number) => `/admin/approvals?status=${status}${nextPage > 1 ? `&page=${nextPage}` : ""}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Approvals" description="Changes college admins have sent for approval. Nothing reaches the live college until you approve it." />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/approvals?status=${tab.value}`}
            aria-current={tab.value === status ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              tab.value === status ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <AdminSection title={`${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "request" : "requests"}`}>
        {data.length === 0 ? (
          <p className="text-sm text-ink-soft">{status === "pending" ? "Nothing is waiting for review." : "No requests here."}</p>
        ) : (
          <ApprovalsTable items={data} paged={meta.pages > 1} />
        )}
      </AdminSection>

      {meta.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm text-ink-soft">
          {meta.page > 1 ? (
            <Link href={href(meta.page - 1)} className="font-medium text-brand hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {meta.page} of {meta.pages}
          </span>
          {meta.page < meta.pages ? (
            <Link href={href(meta.page + 1)} className="font-medium text-brand hover:underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
