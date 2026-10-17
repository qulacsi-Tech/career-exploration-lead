import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { WithdrawButton } from "@/components/admin/withdraw-button";
import { collegeListRequests, getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/request-labels";
import { isCollegeAdmin } from "@/lib/roles";

/*
  A college admin's own requests: what they sent for approval, where each one stands, and the
  reviewer's reason if it was rejected. A waiting one can be withdrawn.
*/
export default async function MyRequestsPage() {
  const result = await withAdminToken(async (token) => {
    const me = await getMe(token);
    return isCollegeAdmin(me.role) ? await collegeListRequests(token) : null;
  });
  // Platform admins review requests under Approvals.
  if (!result) redirect("/admin/approvals");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My requests" description="Changes you have sent for approval." />

      <AdminSection title={`${result.length} ${result.length === 1 ? "request" : "requests"}`}>
        {result.length === 0 ? (
          <p className="text-sm text-ink-soft">
            You have not sent anything yet. Edit your college under{" "}
            <Link href="/admin/college" className="font-semibold text-brand hover:underline">
              Your college
            </Link>{" "}
            and submit it for approval.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {result.map((r) => (
              <li key={r.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{REQUEST_KIND_LABEL[r.kind]}</p>
                    <p className="text-xs text-ink-faint">
                      Sent {formatFull(r.createdAt)}
                      {r.decidedAt && ` · ${r.status === "withdrawn" ? "withdrawn" : `${r.status} by ${r.reviewedBy ?? "the team"}`} ${formatFull(r.decidedAt)}`}
                    </p>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLE[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                </div>
                {r.note && <p className="whitespace-pre-line rounded-lg bg-bg-alt px-3 py-2 text-sm text-ink-soft">Your note: {r.note}</p>}
                {r.reviewNote && (
                  <p className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    Reason from the team: {r.reviewNote}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  {r.status === "pending" && <WithdrawButton id={r.id} />}
                  <Link href={`/admin/messages?new=1&request=${r.id}`} className="font-semibold text-brand hover:underline">
                    Write to the team about this
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
