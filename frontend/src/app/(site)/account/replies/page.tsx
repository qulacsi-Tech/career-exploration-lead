import type { Metadata } from "next";
import Link from "next/link";
import { MarkRepliesRead } from "@/components/account/mark-replies-read";
import { getMyLeads } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { formatFull, prettySlug } from "@/lib/lead-labels";

export const metadata: Metadata = {
  title: "Replies — TopCollegePath",
  robots: { index: false, follow: false },
};

/** What the team has written back, newest first, each under the enquiry it answers. */
export default async function RepliesPage() {
  const token = await getUserToken();
  const leads = token ? await getMyLeads(token).catch(() => null) : [];

  if (leads === null) {
    return <p className="text-sm text-red-700">We could not load your replies just now. Please refresh in a moment.</p>;
  }

  const replies = leads
    .flatMap((lead) => lead.replies.map((reply) => ({ reply, lead })))
    .sort((a, b) => (b.reply.createdAt ?? "").localeCompare(a.reply.createdAt ?? ""));
  const unread = replies.filter(({ reply }) => !reply.read).length;

  if (replies.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-ink">No replies yet</h2>
        <p className="mt-2 text-sm text-ink-soft">
          A counsellor usually calls within one working day. Anything they write back to you appears here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Opening this tab is what reads them. The unread styling below is from before that happens. */}
      <MarkRepliesRead unread={unread} />
      <ul className="space-y-4">
        {replies.map(({ reply, lead }) => (
          <li
            key={reply.id}
            className={`rounded-2xl border p-5 ${reply.read ? "border-line bg-surface" : "border-brand/40 bg-brand-soft"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {reply.authorName}
                {!reply.read && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
              </p>
              <p className="text-xs text-ink-faint">{formatFull(reply.createdAt)}</p>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{reply.body}</p>
            <p className="mt-3 text-xs text-ink-faint">
              About your enquiry on{" "}
              {lead.collegeSlug ? (
                <Link href={`/college/${lead.collegeSlug}`} className="font-medium text-brand hover:underline">
                  {lead.programName ?? prettySlug(lead.collegeSlug)}
                </Link>
              ) : (
                <span className="font-medium text-ink-soft">{lead.programName ?? "TopCollegePath"}</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
