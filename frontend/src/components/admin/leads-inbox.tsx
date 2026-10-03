"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { updateLeadStatus } from "@/lib/admin-actions";
import { LEAD_STATUSES, type AdminLead, type LeadStatus, type PaginationMeta } from "@/lib/api";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  LEAD_TYPE_LABEL,
  formatReceived,
} from "@/lib/lead-labels";

const FILTERS: { value: LeadStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  ...LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABEL[status] })),
];

function inboxHref(status: LeadStatus | undefined, page: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}

function StatusControl({ lead, onError }: { lead: AdminLead; onError: (message: string) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Status for {lead.name}</span>
      <span
        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLE[lead.status]}`}
      >
        {LEAD_STATUS_LABEL[lead.status]}
      </span>
      <select
        value={lead.status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            const result = await updateLeadStatus(lead.id, next);
            if ("error" in result) onError(result.error);
            else router.refresh();
          });
        }}
        className="rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none disabled:opacity-60"
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LeadsInbox({
  leads,
  meta,
  status,
}: {
  leads: AdminLead[];
  meta: PaginationMeta;
  status: LeadStatus | undefined;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads"
        description="Enquiries, callback requests and brochure downloads from the site, newest first."
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.value === status;
          return (
            <Link
              key={filter.label}
              href={inboxHref(filter.value, 1)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {message && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <AdminSection
        title={`${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "lead" : "leads"}`}
        description={status ? `Showing ${LEAD_STATUS_LABEL[status].toLowerCase()} leads.` : "Every lead, all statuses."}
      >
        {leads.length === 0 ? (
          <p className="text-sm text-ink-soft">No leads match this filter.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Phone</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Email</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Interest</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Received</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3 pr-3 font-medium text-ink">{lead.name}</td>
                    <td className="py-3 pr-3 tabular-nums text-ink-soft">{lead.phone}</td>
                    <td className="py-3 pr-3 text-ink-soft">{lead.email ?? "—"}</td>
                    <td className="py-3 pr-3 text-ink-soft">{lead.collegeSlug ?? "—"}</td>
                    <td className="py-3 pr-3 text-ink-soft">{LEAD_TYPE_LABEL[lead.type] ?? lead.type}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatReceived(lead.createdAt)}</td>
                    <td className="py-3">
                      <StatusControl lead={lead} onError={setMessage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {meta.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm text-ink-soft">
          {meta.page > 1 ? (
            <Link href={inboxHref(status, meta.page - 1)} className="font-medium text-brand hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {meta.page} of {meta.pages}
          </span>
          {meta.page < meta.pages ? (
            <Link href={inboxHref(status, meta.page + 1)} className="font-medium text-brand hover:underline">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
