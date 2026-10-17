import type { Metadata } from "next";
import Link from "next/link";
import { getMyLeads } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LEAD_TYPE_LABEL, formatFull, prettySlug } from "@/lib/lead-labels";

export const metadata: Metadata = {
  title: "My enquiries — TopCollegePath",
  robots: { index: false, follow: false },
};

/** Every enquiry the student has sent while signed in, newest first, with where each one stands. */
export default async function EnquiriesPage() {
  const token = await getUserToken();
  const leads = token ? await getMyLeads(token).catch(() => null) : [];

  if (leads === null) {
    return <p className="text-sm text-red-700">We could not load your enquiries just now. Please refresh in a moment.</p>;
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-ink">No enquiries yet</h2>
        <p className="mt-2 text-sm text-ink-soft">
          When you ask a college or a counsellor a question while signed in, it shows up here with its status and any reply.
        </p>
        <Link href="/enquiry" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Request a callback
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {leads.map((lead) => (
        <li key={lead.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-ink">
                {lead.programName ?? (lead.collegeSlug ? prettySlug(lead.collegeSlug) : "General enquiry")}
              </h2>
              <p className="mt-0.5 text-xs text-ink-faint">
                {LEAD_TYPE_LABEL[lead.type] ?? lead.type} · {formatFull(lead.createdAt)}
                {lead.city && ` · ${lead.city}`}
              </p>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLE[lead.status]}`}>
              {LEAD_STATUS_LABEL[lead.status]}
            </span>
          </div>

          {lead.collegeSlug && lead.programName && (
            <p className="mt-2 text-sm text-ink-soft">
              at{" "}
              <Link href={`/college/${lead.collegeSlug}`} className="font-medium text-brand hover:underline">
                {prettySlug(lead.collegeSlug)}
              </Link>
            </p>
          )}
          {lead.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-bg-alt p-3 text-sm text-ink-soft">{lead.message}</p>}

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-ink-faint">Reference TCP-{lead.id.slice(0, 8).toUpperCase()}</span>
            {lead.replies.length > 0 && (
              <Link href="/account/replies" className="font-semibold text-brand hover:underline">
                {lead.replies.length} {lead.replies.length === 1 ? "reply" : "replies"} →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
