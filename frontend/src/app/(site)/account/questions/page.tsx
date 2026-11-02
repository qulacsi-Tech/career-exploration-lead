import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Eye } from "lucide-react";
import { getMyQuestions } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";
import { formatFull } from "@/lib/lead-labels";

export const metadata: Metadata = {
  title: "My questions — TopCollegePath",
  robots: { index: false, follow: false },
};

/**
 * The questions and concerns the student has sent to colleges, newest first. Each shows whether it has been
 * answered, by whom (the college, or our Career Experts), and whether it has been approved for the college's
 * Q&A page.
 */
export default async function QuestionsPage() {
  const token = await getUserToken();
  const items = token ? await getMyQuestions(token).catch(() => null) : [];

  if (items === null) {
    return <p className="text-sm text-red-700">We could not load your questions just now. Please refresh in a moment.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-display text-lg font-bold text-ink">No questions yet</p>
        <p className="mt-1 text-sm text-ink-soft">Ask a college a question from the Q&amp;A tab on its page, and the answer will appear here.</p>
        <Link href="/colleges" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark">Browse colleges</Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((q) => (
        <li key={q.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/college/${q.collegeSlug}/qna`} className="font-display text-lg font-bold text-ink hover:text-brand">{q.collegeName}</Link>
              <p className="text-xs text-ink-faint">{q.kind === "concern" ? "Concern" : "Question"} · {formatFull(q.createdAt)}</p>
            </div>
            {q.answer ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Answered</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900"><Clock className="h-3.5 w-3.5" /> Waiting for a reply</span>
            )}
          </div>

          <p className="mt-3 rounded-xl bg-bg-alt px-4 py-3 text-sm text-ink">{q.question}</p>

          {q.answer && (
            <div className="mt-3 rounded-xl border border-brand/20 bg-brand-soft/50 px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-ink">
                Replied by {q.answeredBy}
                <span className="font-normal text-ink-faint">{formatFull(q.answeredAt)}</span>
              </p>
              <p className="mt-1 text-sm text-ink">{q.answer}</p>
            </div>
          )}

          {q.published && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
              <Eye className="h-3.5 w-3.5" /> Shown on the college&apos;s Q&amp;A page
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
