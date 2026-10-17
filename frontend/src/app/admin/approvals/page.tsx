import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { adminListRequests } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/request-labels";

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

  const { data, meta } = await withAdminToken((token) => adminListRequests(token, { status, page, limit: 25 }));
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
          <ul className="divide-y divide-line-soft">
            {data.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/approvals/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-bg-alt/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{r.collegeName ?? "A college"}</p>
                    <p className="text-xs text-ink-soft">
                      {REQUEST_KIND_LABEL[r.kind]} from {r.requestedBy} · {formatFull(r.createdAt)}
                      {r.reviewedBy && ` · ${r.status} by ${r.reviewedBy}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLE[r.status]}`}>
                    {REQUEST_STATUS_LABEL[r.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
