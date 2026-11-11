"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, X } from "lucide-react";
import type { MyPracticeAttempt } from "@/lib/api";
import { formatFull } from "@/lib/lead-labels";

type ExamGroup = {
  examSlug: string;
  examName: string;
  attempts: MyPracticeAttempt[];
  tests: { testSlug: string; testTitle: string; attempts: MyPracticeAttempt[]; best: MyPracticeAttempt; allowed: number | null; left: number | null }[];
  best: MyPracticeAttempt;
};

const pct = (a: MyPracticeAttempt) => (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0);
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/** The attempts grouped by exam, then by test. The attempts arrive newest first, and stay in that order. */
function groupByExam(attempts: MyPracticeAttempt[]): ExamGroup[] {
  const byExam = new Map<string, MyPracticeAttempt[]>();
  for (const a of attempts) byExam.set(a.examSlug, [...(byExam.get(a.examSlug) ?? []), a]);
  return [...byExam.values()].map((list) => {
    const byTest = new Map<string, MyPracticeAttempt[]>();
    for (const a of list) byTest.set(a.testSlug, [...(byTest.get(a.testSlug) ?? []), a]);
    const best = (rows: MyPracticeAttempt[]) => rows.reduce((top, a) => (pct(a) > pct(top) ? a : top), rows[0]);
    return {
      examSlug: list[0].examSlug,
      examName: list[0].examName,
      attempts: list,
      tests: [...byTest.values()].map((rows) => {
        // The limit the test has now (the newest attempt carries it), and what that leaves.
        const allowed = rows[0].attemptsAllowed;
        return { testSlug: rows[0].testSlug, testTitle: rows[0].testTitle, attempts: rows, best: best(rows), allowed, left: allowed === null ? null : Math.max(0, allowed - rows.length) };
      }),
      best: best(list),
    };
  });
}

/**
 * Practice tests the student has sat, one row for each exam: how many attempts and the best score. View opens the
 * exam's tests with every attempt and its score.
 */
export function PracticeAttempts({ attempts }: { attempts: MyPracticeAttempt[] }) {
  const groups = useMemo(() => groupByExam(attempts), [attempts]);
  const [open, setOpen] = useState<string | null>(null);
  const current = groups.find((g) => g.examSlug === open) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="practice-attempts" className="mb-8">
      <h2 id="practice-attempts" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden="true" /> Exam attempts
      </h2>
      <p className="mt-1 text-sm text-ink-soft">The practice tests you have sat, with your scores.</p>
      <ul className="mt-4 space-y-3">
        {groups.map((g) => (
          <li key={g.examSlug} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{g.examName}</p>
              <p className="mt-0.5 text-xs text-ink-faint">Last attempt {formatFull(g.attempts[0].submittedAt)}</p>
            </div>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-[11px] font-semibold text-ink-faint">Attempts</dt>
                <dd className="font-display text-lg font-bold text-ink">{g.attempts.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-ink-faint">Best score</dt>
                <dd className="font-display text-lg font-bold text-ink">
                  {num(g.best.score)}<span className="text-sm font-medium text-ink-faint">/{num(g.best.maxScore)}</span>
                </dd>
              </div>
            </dl>
            <button type="button" onClick={() => setOpen(g.examSlug)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
              View
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4 py-6" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="attempts-title" onClick={(e) => e.stopPropagation()} className="flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h3 id="attempts-title" className="font-display text-lg font-bold text-ink">{current.examName}</h3>
                <p className="text-sm text-ink-soft">
                  {current.attempts.length} {current.attempts.length === 1 ? "attempt" : "attempts"} across {current.tests.length} {current.tests.length === 1 ? "test" : "tests"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded-lg border border-line p-1.5 text-ink-soft hover:border-brand hover:text-brand">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto px-6 py-5">
              {current.tests.map((t) => (
                <div key={t.testSlug}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-semibold text-ink">{t.testTitle}</h4>
                    <p className="text-xs text-ink-soft">
                      {t.attempts.length} {t.attempts.length === 1 ? "attempt" : "attempts"}
                      {t.allowed !== null && ` of ${t.allowed} · ${t.left === 0 ? "none left" : `${t.left} left`}`} · best {num(t.best.score)}/{num(t.best.maxScore)}
                    </p>
                  </div>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[480px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-bg-alt/60 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">Right / wrong / skipped</th>
                          <th className="px-3 py-2">Accuracy</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.attempts.map((a, i) => (
                          <tr key={a.id} className="border-t border-line">
                            <td className="px-3 py-2 text-ink-faint">{t.attempts.length - i}</td>
                            <td className="px-3 py-2 font-semibold text-ink">{num(a.score)}/{num(a.maxScore)}</td>
                            <td className="px-3 py-2 text-ink-soft">{a.correct} / {a.incorrect} / {a.skipped}</td>
                            <td className="px-3 py-2 text-ink-soft">{a.accuracy.toFixed(0)}%</td>
                            <td className="px-3 py-2 text-ink-soft">{duration(a.totalSeconds)}</td>
                            <td className="px-3 py-2 text-ink-soft">{formatFull(a.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {t.left === 0 ? (
                    <p className="mt-2 text-xs font-medium text-ink-faint">All attempts used.</p>
                  ) : (
                    <Link href={`/exams/${current.examSlug}/practice/${t.testSlug}`} className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">
                      Take it again
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
