"use client";

import Link from "next/link";
import { optionsOf, useTableTools } from "@/components/admin/table-tools";
import type { ThreadSummary } from "@/lib/api";
import { formatFull } from "@/lib/lead-labels";

/** The conversations between college admins and the platform team, as a table that can be searched, filtered and sorted. */
export function ThreadsTable({
  threads,
  selected,
  showCollege,
  status,
  paged,
}: {
  threads: ThreadSummary[];
  selected: string | undefined;
  showCollege: boolean;
  /** The status tab in view, kept in the link to a conversation. */
  status: string | null;
  paged: boolean;
}) {
  const href = (id: string) => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    qs.set("thread", id);
    return `/admin/messages?${qs}`;
  };

  const t = useTableTools<ThreadSummary>({
    rows: threads,
    search: (x) => [x.subject, x.collegeName ?? "", x.last?.sender ?? "", x.last?.body ?? ""].join(" "),
    placeholder: "Search subject, college, message",
    note: paged ? "Search, filters and sorting cover the conversations on this page." : undefined,
    sorts: {
      subject: (x) => x.subject,
      college: (x) => x.collegeName ?? null,
      status: (x) => (x.status === "open" ? 0 : 1),
      last: (x) => x.last?.body ?? null,
      updated: (x) => (x.updatedAt ? Date.parse(x.updatedAt) : null),
    },
    filters: [
      ...(showCollege ? [{ key: "college", label: "College", options: optionsOf(threads, (x) => x.collegeName), match: (x: ThreadSummary, v: string) => x.collegeName === v }] : []),
      { key: "status", label: "Status", options: [{ value: "open", label: "Waiting" }, { value: "resolved", label: "Resolved" }], match: (x, v) => x.status === v },
    ],
  });

  if (threads.length === 0) return <p className="text-sm text-ink-soft">Nothing here.</p>;

  return (
    <div className="space-y-3">
      {t.toolbar}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-bg-alt text-xs">
            <tr>
              {t.th("subject", "Subject")}
              {showCollege && t.th("college", "College")}
              {t.th("status", "Status")}
              {t.th("last", "Last message")}
              {t.th("updated", "Updated")}
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-soft">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {t.rows.length === 0 && (
              <tr><td colSpan={showCollege ? 6 : 5} className="px-4 py-8 text-center text-sm text-ink-soft">No conversations match.</td></tr>
            )}
            {t.rows.map((x) => (
              <tr key={x.id} aria-current={x.id === selected ? "true" : undefined} className={x.id === selected ? "bg-brand-soft/40" : "hover:bg-bg-alt/50"}>
                <td className="max-w-[16rem] truncate px-3 py-2.5 font-semibold text-ink">
                  <Link href={href(x.id)} className="hover:text-brand hover:underline">{x.subject}</Link>
                </td>
                {showCollege && <td className="px-3 py-2.5 text-ink-soft">{x.collegeName ?? "–"}</td>}
                <td className="px-3 py-2.5">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${x.status === "open" ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg-alt text-ink-faint"}`}>
                    {x.status === "open" ? "Waiting" : "Resolved"}
                  </span>
                </td>
                <td className="max-w-[20rem] px-3 py-2.5 text-ink-soft">
                  {x.last ? <span className="line-clamp-1">{x.last.sender}: {x.last.body}</span> : "–"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{formatFull(x.updatedAt)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={href(x.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
