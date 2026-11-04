"use client";

import Link from "next/link";
import { optionsOf, useTableTools } from "@/components/admin/table-tools";
import type { ChangeRequestItem } from "@/lib/api";
import { formatFull } from "@/lib/lead-labels";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_STYLE } from "@/lib/request-labels";

/** The changes college admins sent for approval, as a table that can be searched, filtered and sorted. */
export function ApprovalsTable({ items, paged }: { items: ChangeRequestItem[]; paged: boolean }) {
  const t = useTableTools<ChangeRequestItem>({
    rows: items,
    search: (r) => [r.collegeName ?? "", r.requestedBy, r.reviewedBy ?? "", REQUEST_KIND_LABEL[r.kind]].join(" "),
    placeholder: "Search college or person",
    note: paged ? "Search, filters and sorting cover the requests on this page." : undefined,
    sorts: {
      college: (r) => r.collegeName ?? "",
      kind: (r) => REQUEST_KIND_LABEL[r.kind],
      by: (r) => r.requestedBy,
      date: (r) => (r.createdAt ? Date.parse(r.createdAt) : null),
      status: (r) => REQUEST_STATUS_LABEL[r.status],
      decider: (r) => r.reviewedBy ?? null,
    },
    filters: [
      { key: "college", label: "College", options: optionsOf(items, (r) => r.collegeName), match: (r, v) => r.collegeName === v },
      { key: "kind", label: "Change", options: optionsOf(items, (r) => r.kind, (v) => REQUEST_KIND_LABEL[v as keyof typeof REQUEST_KIND_LABEL] ?? v), match: (r, v) => r.kind === v },
      { key: "status", label: "Status", options: optionsOf(items, (r) => r.status, (v) => REQUEST_STATUS_LABEL[v as keyof typeof REQUEST_STATUS_LABEL] ?? v), match: (r, v) => r.status === v },
    ],
  });

  return (
    <div className="space-y-3">
      {t.toolbar}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="text-xs">
            <tr className="border-b border-line">
              {t.th("college", "College")}
              {t.th("kind", "Change")}
              {t.th("by", "Sent by")}
              {t.th("date", "Sent on")}
              {t.th("status", "Status")}
              {t.th("decider", "Decided by")}
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-soft">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {t.rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-soft">No requests match.</td></tr>
            )}
            {t.rows.map((r) => (
              <tr key={r.id} className="hover:bg-bg-alt/50">
                <td className="px-3 py-2.5 font-semibold text-ink">{r.collegeName ?? "A college"}</td>
                <td className="px-3 py-2.5 text-ink-soft">{REQUEST_KIND_LABEL[r.kind]}</td>
                <td className="px-3 py-2.5 text-ink-soft">{r.requestedBy}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{formatFull(r.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLE[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                </td>
                <td className="px-3 py-2.5 text-ink-soft">{r.reviewedBy ?? "–"}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={`/admin/approvals/${r.id}`} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                    {r.status === "pending" ? "Review" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
