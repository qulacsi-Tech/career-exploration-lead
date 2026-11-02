"use client";

import { useEffect, useState, useTransition } from "react";
import { BadgeCheck, MessageCircleQuestion, ThumbsUp } from "lucide-react";
import { loadCollegeQuestions, toggleHelpful } from "@/lib/college-engage-actions";
import { useCollegeActions } from "@/components/college/college-actions";
import type { CollegeQuestion } from "@/lib/api";

/**
 * The questions students asked this college, with the answer and who gave it: the college itself, or our
 * Career Experts. Only the ones the platform team approved are here. Any other student can mark an answer
 * helpful, but has to sign in or register first; the count is shown to everyone.
 */
export function StudentQA({ slug }: { slug: string }) {
  const [items, setItems] = useState<CollegeQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const actions = useCollegeActions();

  useEffect(() => {
    let alive = true;
    loadCollegeQuestions(slug).then((found) => alive && setItems(found.items));
    return () => {
      alive = false;
    };
  }, [slug]);

  const mark = (id: string) =>
    start(async () => {
      setError(null);
      const result = await toggleHelpful(id);
      if (result.ok) setItems((current) => current?.map((q) => (q.id === id ? { ...q, helpful: result.helpful, helpfulByMe: result.helpfulByMe } : q)) ?? current);
      else setError(result.message);
    });

  /** Signed in: count it. Not signed in: ask them to sign in or register first, then count it. */
  const onHelpful = (id: string) => {
    if (actions) void actions.ensureSignedIn("Sign in to mark this answer helpful. It takes a minute.", () => mark(id));
    else mark(id);
  };

  if (!items || items.length === 0) return null;

  return (
    <section aria-label="Questions from students" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><MessageCircleQuestion className="h-6 w-6" /></span>
        <div>
          <h3 className="font-display text-xl font-bold text-ink">Questions from students</h3>
          <p className="text-sm text-ink-soft">Asked by students, answered by the college or our Career Experts.</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft font-display text-sm font-bold text-brand">Q</span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">{q.question}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Asked by {q.askedBy}
                  {q.kind === "concern" ? " · a concern" : ""}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-3 rounded-xl bg-bg-alt p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white font-display text-sm font-bold text-brand shadow-sm">A</span>
              <div className="min-w-0">
                <p className="text-base leading-relaxed text-ink-soft">{q.answer}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Replied by {q.answeredBy}
                </p>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onHelpful(q.id)}
                disabled={pending}
                aria-pressed={q.helpfulByMe}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                  q.helpfulByMe ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${q.helpfulByMe ? "fill-brand text-brand" : ""}`} />
                Helpful{q.helpful > 0 ? ` (${q.helpful})` : ""}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
