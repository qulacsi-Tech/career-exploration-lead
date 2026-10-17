import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { DiffView } from "@/components/admin/diff-view";
import { ApiError, adminGetRequest } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/request-labels";

export default async function ApprovalDetailPage({ params }: PageProps<"/admin/approvals/[id]">) {
  const { id } = await params;
  const request = await withAdminToken((token) => adminGetRequest(token, id)).catch((err) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });
  const pending = request.status === "pending";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${REQUEST_KIND_LABEL[request.kind]}: ${request.collegeName ?? "college"}`}
        description={`From ${request.requestedBy}, ${formatFull(request.createdAt)}.`}
        actions={
          <>
            <Link href="/admin/approvals" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
              All requests
            </Link>
            {request.collegeSlug && (
              <Link href={`/college/${request.collegeSlug}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
                Live page
              </Link>
            )}
            {request.threadId && (
              <Link href={`/admin/messages?status=all&thread=${request.threadId}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
                Conversation
              </Link>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLE[request.status]}`}>{REQUEST_STATUS_LABEL[request.status]}</span>
        {!pending && (
          <p className="text-sm text-ink-soft">
            {request.status === "withdrawn" ? "Withdrawn by the college admin" : `${REQUEST_STATUS_LABEL[request.status]} by ${request.reviewedBy ?? "the team"}`} on {formatFull(request.decidedAt)}.
          </p>
        )}
      </div>

      {request.note && (
        <AdminSection title={request.kind === "delete" ? "Why they want it removed" : "Their note"}>
          <p className="whitespace-pre-line text-sm text-ink">{request.note}</p>
        </AdminSection>
      )}

      {request.reviewNote && (
        <AdminSection title="Reason given">
          <p className="whitespace-pre-line text-sm text-ink">{request.reviewNote}</p>
        </AdminSection>
      )}

      {request.kind === "edit" && (
        <AdminSection
          title={`${request.diff.length} ${request.diff.length === 1 ? "change" : "changes"}`}
          description={pending ? "Compared with the college as it is live now." : "Compared with the college as it is now, which may include later edits."}
        >
          <DiffView diff={request.diff} />
        </AdminSection>
      )}

      {pending && <DecisionPanel id={request.id} kind={request.kind} stale={request.stale} />}
    </div>
  );
}
