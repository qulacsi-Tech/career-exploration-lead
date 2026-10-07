"use client";

import { useEffect, useState, useTransition } from "react";
import { createPracticeTest, loadPracticeTests } from "@/lib/admin-actions";
import type { AdminPracticeCard } from "@/lib/api";

/*
  The Practice tests tab of an exam: the mock tests candidates can sit for it.

  Lists the exam's tests, drafts included, and adds a new one. Opening a test (or adding
  one) goes to the test editor, which is where the questions are written or imported.
  Tests are stored when saved in the editor, separately from the exam's own Save.
*/

const KIND_LABEL: Record<AdminPracticeCard["kind"], string> = {
  "full-mock": "Full mock",
  sectional: "Sectional",
  "previous-year": "Previous year",
  sample: "Sample set",
};

export function PracticeTestsTab({
  examSlug,
  refreshKey,
  note,
  onEdit,
}: {
  examSlug: string;
  /** Changes when a test was saved or deleted, so the list is read again. */
  refreshKey: number;
  /** What happened last in the editor, shown above the list. */
  note: string | null;
  onEdit: (slug: string) => void;
}) {
  const [tests, setTests] = useState<AdminPracticeCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    loadPracticeTests(examSlug).then((result) => {
      if (!alive) return;
      if ("error" in result) setLoadError(result.error);
      else {
        setLoadError(null);
        setTests(result);
      }
    });
    return () => {
      alive = false;
    };
  }, [examSlug, refreshKey]);

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPracticeTest(examSlug, title);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTitle("");
      onEdit(result.slug);
    });
  };

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-ink-soft">
        Mock tests for this exam. Everything on the exam&apos;s practice pages comes from here: the test cards, the instructions, the questions with their options, and the answers and solutions in the results. Write questions by hand or import them from a spreadsheet.
      </p>

      {note && (
        <p role="status" className="rounded-lg border border-line bg-bg-alt px-4 py-2.5 text-sm text-ink">
          {note}
        </p>
      )}
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load the tests: {loadError}</p>}

      {!tests && !loadError && <p className="text-sm text-ink-soft">Loading the tests…</p>}

      {tests && tests.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
          No practice tests for this exam yet. The exam page shows no practice section until one is published.
        </p>
      )}

      {tests && tests.length > 0 && (
        <ul className="space-y-2">
          {tests.map((t) => (
            <li key={t.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {KIND_LABEL[t.kind]} · {t.questionCount} question{t.questionCount === 1 ? "" : "s"} · {t.sectionCount} section{t.sectionCount === 1 ? "" : "s"} ·{" "}
                  {t.totalMinutes > 0 ? `${t.totalMinutes} min` : "Untimed"}
                  {t.isFree ? " · Free sample" : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.isPublished ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                {t.isPublished ? "Published" : "Draft"}
              </span>
              {t.isPublished && (
                <a href={`/exams/${examSlug}/practice/${t.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand hover:underline">
                  View
                </a>
              )}
              <button type="button" onClick={() => onEdit(t.slug)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="max-w-xl">
        <label htmlFor="pt-new-title" className="block text-xs font-semibold text-ink">
          Add a practice test
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="pt-new-title"
            maxLength={200}
            value={title}
            placeholder="e.g. Full Mock 1"
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim().length >= 2 && !pending) {
                e.preventDefault();
                create();
              }
            }}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button type="button" onClick={create} disabled={title.trim().length < 2 || pending} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {pending ? "Creating…" : "Create and open"}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
