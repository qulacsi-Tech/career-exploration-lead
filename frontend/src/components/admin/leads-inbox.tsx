"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { replyToLead, updateLeadStatus } from "@/lib/admin-actions";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { LEAD_STATUSES, type AdminLead, type LeadStatus, type PaginationMeta } from "@/lib/api";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  LEAD_TYPE_LABEL,
  formatFull,
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

function StatusControl({
  lead,
  onError,
  onSaved,
}: {
  lead: AdminLead;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
}) {
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
            else {
              onSaved(`${lead.name} marked ${LEAD_STATUS_LABEL[next as LeadStatus]}.`);
              router.refresh();
            }
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

function LeadDetail({
  lead,
  onError,
  onSaved,
}: {
  lead: AdminLead;
  onError: (message: string) => void;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  const facts: [string, string | null][] = [
    ["Stream", lead.stream],
    ["City", lead.city],
    ["Programme", lead.programName],
    ["Came from", lead.source ? `${lead.source}${lead.sourceUrl ? ` (${lead.sourceUrl})` : ""}` : null],
    ["Consent to be contacted", lead.consent ? "Given" : "Not recorded"],
    ["Account", lead.userId ? "Signed in when sent" : "Anonymous visitor"],
    ["Asked again", lead.repeatCount > 0 ? `${lead.repeatCount} more ${lead.repeatCount === 1 ? "time" : "times"}` : null],
  ];

  return (
    <div className="grid gap-5 rounded-xl bg-bg-alt p-4 md:grid-cols-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">What they sent</h3>
        {lead.message && <p className="mt-2 whitespace-pre-line text-sm text-ink">{lead.message}</p>}
        <dl className="mt-3 space-y-1 text-sm">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-40 shrink-0 text-ink-faint">{label}</dt>
                <dd className="min-w-0 break-words text-ink-soft">{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Replies</h3>
        {lead.replies.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No reply sent yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {lead.replies.map((reply) => (
              <li key={reply.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                <p className="whitespace-pre-line text-ink">{reply.body}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {reply.authorName} · {formatFull(reply.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {lead.userId ? (
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await replyToLead(lead.id, body);
                if ("error" in result) onError(result.error);
                else {
                  setBody("");
                  onSaved(`Reply sent to ${lead.name}.`);
                  router.refresh();
                }
              });
            }}
          >
            <label htmlFor={`reply-${lead.id}`} className="sr-only">
              Reply to {lead.name}
            </label>
            <textarea
              id={`reply-${lead.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Write a reply. They see it under My account → Replies."
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || body.trim().length < 2}
              className="mt-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reply"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-ink-faint">
            This visitor was not signed in, so there is no account to show a reply on. Call them on {lead.phone}.
          </p>
        )}
      </div>
    </div>
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
  const [flash, showFlash] = useFlash();
  const [openId, setOpenId] = useState<string | null>(null);

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

      <StatusMessage flash={flash} />

      <AdminSection
        title={`${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "lead" : "leads"}`}
        description={status ? `Showing ${LEAD_STATUS_LABEL[status].toLowerCase()} leads.` : "Every lead, all statuses."}
      >
        {leads.length === 0 ? (
          <p className="text-sm text-ink-soft">No leads match this filter.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Phone</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Email</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Interest</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Received</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                  <th scope="col" className="py-2 font-semibold">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const open = openId === lead.id;
                  return (
                    <Fragment key={lead.id}>
                      <tr className="border-b border-line-soft last:border-b-0">
                        <td className="py-3 pr-3 font-medium text-ink">{lead.name}</td>
                        <td className="py-3 pr-3 tabular-nums text-ink-soft">{lead.phone}</td>
                        <td className="py-3 pr-3 text-ink-soft">{lead.email ?? "—"}</td>
                        <td className="py-3 pr-3 text-ink-soft">{lead.collegeSlug ?? "—"}</td>
                        <td className="py-3 pr-3 text-ink-soft">{LEAD_TYPE_LABEL[lead.type] ?? lead.type}</td>
                        <td className="py-3 pr-3 text-ink-faint">{formatReceived(lead.createdAt)}</td>
                        <td className="py-3 pr-3">
                          <StatusControl
                            lead={lead}
                            onError={(text) => showFlash("error", text)}
                            onSaved={(text) => showFlash("ok", text)}
                          />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : lead.id)}
                            className="whitespace-nowrap text-xs font-semibold text-brand hover:underline"
                          >
                            {open ? "Hide" : "Details"}
                            {lead.replies.length > 0 && ` · ${lead.replies.length} ${lead.replies.length === 1 ? "reply" : "replies"}`}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-line-soft">
                          <td colSpan={8} className="pb-4">
                            <LeadDetail
                              lead={lead}
                              onError={(text) => showFlash("error", text)}
                              onSaved={(text) => showFlash("ok", text)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
