"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { decideRating } from "@/lib/admin-actions";
import { formatFull } from "@/lib/lead-labels";
import type { AdminRating } from "@/lib/api";
import { optionsOf, useTableTools } from "@/components/admin/table-tools";

const AREAS = [
  { rating: "ratingPlacements", comment: "commentPlacements", label: "Placements" },
  { rating: "ratingFaculty", comment: "commentFaculty", label: "Faculty" },
  { rating: "ratingInfrastructure", comment: "commentInfrastructure", label: "Infrastructure" },
  { rating: "ratingCampusLife", comment: "commentCampusLife", label: "Campus life" },
] as const;

const fixed = (n: number | null) => (n === null ? "–" : n.toFixed(1));

/**
 * The student ratings as a table: one row for each review, with its four ratings side by side. A comment on a
 * rating shows as a small speech bubble (and in full in the row that opens under the review). Approving shows the
 * review on its college's page; rejecting hides it.
 */
export function RatingsTable({ items: initial, paged = false, initialCollege }: { items: AdminRating[]; paged?: boolean; initialCollege?: string }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const t = useTableTools<AdminRating>({
    rows: items,
    search: (r) => [r.collegeName, r.author, r.email, r.course, r.batch, r.body].join(" "),
    placeholder: "Search college, student, review",
    initialFilters: initialCollege ? { college: initialCollege } : undefined,
    note: paged ? "Search, filters and sorting cover the reviews on this page." : undefined,
    sorts: {
      college: (r) => r.collegeName,
      student: (r) => r.author,
      programme: (r) => r.course,
      overall: (r) => r.rating,
      placements: (r) => r.ratingPlacements,
      faculty: (r) => r.ratingFaculty,
      infra: (r) => r.ratingInfrastructure,
      campus: (r) => r.ratingCampusLife,
      date: (r) => (r.createdAt ? Date.parse(r.createdAt) : null),
      status: (r) => (r.approved ? 1 : 0),
    },
    filters: [
      { key: "college", label: "College", options: optionsOf(items, (r) => r.collegeName), match: (r, v) => r.collegeName === v },
      { key: "programme", label: "Programme", options: optionsOf(items, (r) => r.course), match: (r, v) => r.course === v },
      {
        key: "comments",
        label: "Comments",
        options: [{ value: "with", label: "With comments" }, { value: "without", label: "Without comments" }],
        match: (r, v) => (AREAS.some((a) => r[a.comment]) ? v === "with" : v === "without"),
      },
      {
        key: "status",
        label: "Status",
        options: [{ value: "shown", label: "Shown" }, { value: "waiting", label: "Waiting" }],
        match: (r, v) => (r.approved ? v === "shown" : v === "waiting"),
      },
    ],
  });

  const decide = (id: string, approved: boolean) =>
    start(async () => {
      setMessage(null);
      const result = await decideRating(id, approved);
      if ("error" in result) return setMessage(result.error);
      setItems((current) => current.map((r) => (r.id === id ? { ...r, approved } : r)));
    });

  if (items.length === 0) return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">No ratings here.</p>;

  return (
    <div className="space-y-3">
      {message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{message}</p>}
      {t.toolbar}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-bg-alt text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              {t.th("college", "College")}
              {t.th("student", "Student")}
              {t.th("programme", "Programme")}
              {t.th("overall", "Overall", "px-3 py-2.5 text-center")}
              {t.th("placements", "Placements", "px-3 py-2.5 text-center")}
              {t.th("faculty", "Faculty", "px-3 py-2.5 text-center")}
              {t.th("infra", "Infra", "px-3 py-2.5 text-center")}
              {t.th("campus", "Campus", "px-3 py-2.5 text-center")}
              {t.th("date", "Date")}
              {t.th("status", "Status")}
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {t.rows.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-ink-soft">No reviews match.</td></tr>
            )}
            {t.rows.map((r) => {
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className={isOpen ? "bg-brand-soft/30" : "hover:bg-bg-alt/50"}>
                    <td className="px-3 py-2.5 font-semibold text-ink">
                      <Link href={`/college/${r.collegeSlug}/reviews`} className="hover:text-brand hover:underline">{r.collegeName}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{r.author}</p>
                      {r.email && <p className="text-xs text-ink-faint">{r.email}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{r.course}<span className="block text-xs text-ink-faint">Batch {r.batch}</span></td>
                    <td className="px-3 py-2.5 text-center font-bold text-ink">{fixed(r.rating)}</td>
                    {AREAS.map((a) => (
                      <td key={a.rating} className="px-3 py-2.5 text-center text-ink-soft">
                        {fixed(r[a.rating])}
                        {r[a.comment] && (
                          <button type="button" title={r[a.comment]} aria-label={`Comment on ${a.label}`} onClick={() => setOpen(isOpen ? null : r.id)} className="ml-1 inline-block align-middle text-brand">
                            <MessageSquareText className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{r.createdAt ? formatFull(r.createdAt) : "–"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.approved ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{r.approved ? "Shown" : "Waiting"}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                        {isOpen ? "Hide" : "Read"}
                      </button>
                      {r.approved ? (
                        <button type="button" disabled={pending} onClick={() => decide(r.id, false)} className="ml-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:border-red-300 hover:text-red-700 disabled:opacity-50">Hide it</button>
                      ) : (
                        <button type="button" disabled={pending} onClick={() => decide(r.id, true)} className="ml-1.5 rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">Approve</button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-bg-alt/40">
                      <td colSpan={11} className="px-4 py-4">
                        <p className="text-sm text-ink">{r.body}</p>
                        {AREAS.some((a) => r[a.comment]) ? (
                          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                            {AREAS.filter((a) => r[a.comment]).map((a) => (
                              <div key={a.comment} className="rounded-lg border border-line bg-surface px-3 py-2">
                                <dt className="text-xs font-semibold text-ink-soft">{a.label} · {fixed(r[a.rating])} / 5</dt>
                                <dd className="mt-0.5 text-sm text-ink">{r[a.comment]}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="mt-2 text-xs text-ink-faint">No comments on the individual ratings.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
