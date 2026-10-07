"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deletePracticeTest, loadPracticeTest, savePracticeTest } from "@/lib/admin-actions";
import type { AdminPracticeQuestion, AdminPracticeSection, AdminPracticeTest } from "@/lib/api";
import { CSV_TEMPLATE, importQuestionsFromCsv } from "@/lib/practice-csv";
import { AdminModal } from "@/components/admin/admin-modal";
import { FigureButton, FigurePreviews, withFigure } from "@/components/admin/practice-figures";

/*
  One practice test, edited as plain text in a single page:

    Settings   title, kind, time, language, attempts, free sample, section lock, published
    Import     questions from a spreadsheet saved as CSV (a template can be downloaded)
    Sections   each with its questions: the question, the options with the correct answer
               marked, the marks, and the worked solution

  The question, the passage, each option and the solution can carry images, GIFs or
  diagrams: use Add an image under the field (or Image on an option). Each is a figure
  line in the text (see practice-figures.tsx), so it stays where it is placed.

  Everything the candidate sees (the card, the instructions, the paper) and everything the
  results show (the correct answer and solution) comes from here. Candidates never receive
  the correct answers before they submit; the server holds them.

  One Save keeps the whole test. A draft is invisible to candidates until Published is ticked.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const MAX_OPTIONS = 6;
const LETTERS = "ABCDEF";

const KINDS: { value: AdminPracticeTest["kind"]; label: string }[] = [
  { value: "full-mock", label: "Full mock" },
  { value: "sectional", label: "Sectional" },
  { value: "previous-year", label: "Previous year paper" },
  { value: "sample", label: "Sample set" },
];

const blankQuestion = (type: AdminPracticeQuestion["type"] = "mcq-single"): AdminPracticeQuestion => ({
  type,
  topic: "",
  difficulty: "medium",
  stem: "",
  passage: "",
  options: type === "tita" ? [] : ["", "", "", ""],
  correctOptions: [],
  answerValue: null,
  tolerance: 0,
  marks: 1,
  negativeMarks: 0,
  expectedSeconds: 120,
  solution: "",
});

const typeLabel = (t: AdminPracticeQuestion["type"]) =>
  t === "mcq-single" ? "Single answer" : t === "mcq-multi" ? "Multiple answers" : "Type-in answer";

/** What is missing from a question, or null when it is complete. Mirrors the server's checks. */
function problemWith(q: AdminPracticeQuestion): string | null {
  if (!q.stem.trim()) return "Question text is empty";
  if (q.type === "tita") return q.answerValue === null ? "No correct number" : null;
  if (q.options.length < 2 || q.options.some((o) => !o.trim())) return "Needs two or more filled options";
  if (q.correctOptions.length === 0) return "No correct option marked";
  return null;
}

export function PracticeTestEditor({
  slug,
  examSlug,
  onClose,
}: {
  slug: string;
  examSlug: string;
  /** `message` is set when the test was saved or deleted, so the list can refresh and say so. */
  onClose: (message?: string) => void;
}) {
  const [test, setTest] = useState<AdminPracticeTest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<{ added: number; problems: string[] } | null>(null);
  const [open, setOpen] = useState<{ s: number; q: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadPracticeTest(slug).then((result) => {
      if (!alive) return;
      if ("error" in result) setLoadError(result.error);
      else {
        const { title, kind, summary, totalMinutes, sectionLock, languages, attemptsAllowed, isFree, isPublished, sections } = result;
        setTest({ title, kind, summary, totalMinutes, sectionLock, languages, attemptsAllowed, isFree, isPublished, sections });
      }
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const edit = (change: (t: AdminPracticeTest) => AdminPracticeTest) => {
    setTest((t) => (t ? change(t) : t));
    setError(null);
  };
  const set = <K extends keyof AdminPracticeTest>(key: K, value: AdminPracticeTest[K]) => edit((t) => ({ ...t, [key]: value }));
  const setSection = (si: number, change: Partial<AdminPracticeSection>) =>
    edit((t) => ({ ...t, sections: t.sections.map((s, i) => (i === si ? { ...s, ...change } : s)) }));
  const setQuestion = (si: number, qi: number, change: Partial<AdminPracticeQuestion>) =>
    edit((t) => ({
      ...t,
      sections: t.sections.map((s, i) =>
        i === si ? { ...s, questions: s.questions.map((q, n) => (n === qi ? { ...q, ...change } : q)) } : s
      ),
    }));

  const changeType = (si: number, qi: number, q: AdminPracticeQuestion, type: AdminPracticeQuestion["type"]) => {
    if (type === "tita") setQuestion(si, qi, { type, options: [], correctOptions: [] });
    else
      setQuestion(si, qi, {
        type,
        options: q.options.length >= 2 ? q.options : ["", "", "", ""],
        correctOptions: type === "mcq-single" ? q.correctOptions.slice(0, 1) : q.correctOptions,
      });
  };

  const toggleCorrect = (si: number, qi: number, q: AdminPracticeQuestion, index: number) => {
    if (q.type === "mcq-single") return setQuestion(si, qi, { correctOptions: [index] });
    const has = q.correctOptions.includes(index);
    setQuestion(si, qi, { correctOptions: (has ? q.correctOptions.filter((i) => i !== index) : [...q.correctOptions, index]).sort((a, b) => a - b) });
  };

  const removeOption = (si: number, qi: number, q: AdminPracticeQuestion, index: number) =>
    setQuestion(si, qi, {
      options: q.options.filter((_, i) => i !== index),
      correctOptions: q.correctOptions.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    });

  const moveQuestion = (si: number, qi: number, direction: -1 | 1) => {
    edit((t) => {
      const list = [...t.sections[si].questions];
      const target = qi + direction;
      if (target < 0 || target >= list.length) return t;
      [list[qi], list[target]] = [list[target], list[qi]];
      return { ...t, sections: t.sections.map((s, i) => (i === si ? { ...s, questions: list } : s)) };
    });
    setOpen({ s: si, q: qi + direction });
  };

  const addQuestion = (si: number, type: AdminPracticeQuestion["type"]) => {
    if (!test) return;
    const at = test.sections[si].questions.length;
    edit((t) => ({
      ...t,
      sections: t.sections.map((s, i) => (i === si ? { ...s, questions: [...s.questions, blankQuestion(type)] } : s)),
    }));
    setOpen({ s: si, q: at });
  };

  const removeQuestion = (si: number, qi: number) => {
    edit((t) => ({
      ...t,
      sections: t.sections.map((s, i) => (i === si ? { ...s, questions: s.questions.filter((_, n) => n !== qi) } : s)),
    }));
    setOpen(null);
  };

  const duplicateQuestion = (si: number, qi: number) => {
    edit((t) => ({
      ...t,
      sections: t.sections.map((s, i) => {
        if (i !== si) return s;
        const list = [...s.questions];
        list.splice(qi + 1, 0, { ...s.questions[qi], options: [...s.questions[qi].options], correctOptions: [...s.questions[qi].correctOptions] });
        return { ...s, questions: list };
      }),
    }));
    setOpen({ s: si, q: qi + 1 });
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "practice-questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File | undefined) => {
    if (!file || !test) return;
    const { sections, problems } = importQuestionsFromCsv(await file.text(), test.sections[0]?.label || "Section 1");
    const added = sections.reduce((n, s) => n + s.questions.length, 0);
    setImportNote({ added, problems });
    if (added === 0) return;
    edit((t) => {
      // A test that is still empty takes the file's sections as they are. Otherwise the
      // questions join the section of the same name, or a new section.
      if (t.sections.every((s) => s.questions.length === 0)) {
        return { ...t, sections: sections.map((s, i) => ({ ...s, durationMinutes: t.sections[i]?.durationMinutes ?? null })) };
      }
      const next = t.sections.map((s) => ({ ...s, questions: [...s.questions] }));
      for (const incoming of sections) {
        const match = next.find((s) => s.label.trim().toLowerCase() === incoming.label.trim().toLowerCase());
        if (match) match.questions.push(...incoming.questions);
        else next.push(incoming);
      }
      return { ...t, sections: next };
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Save / delete ─────────────────────────────────────────────────────────

  const total = test?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  const incomplete = test ? test.sections.flatMap((s) => s.questions).filter((q) => problemWith(q) !== null).length : 0;
  const canSave = !!test && test.title.trim().length >= 2 && test.sections.every((s) => s.label.trim() !== "");

  const save = () => {
    if (!test) return;
    setError(null);
    startTransition(async () => {
      const result = await savePracticeTest(slug, examSlug, { ...test, title: test.title.trim() });
      if ("error" in result) setError(result.error);
      else onClose(result.message);
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deletePracticeTest(slug, examSlug);
      if ("error" in result) {
        setConfirmingDelete(false);
        setError(result.error);
      } else onClose(result.message);
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {confirmingDelete ? (
          <>
            <span className="text-xs text-ink-soft">Delete this test and its questions?</span>
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmingDelete(true)} disabled={pending || !test} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">
            Delete test
          </button>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {test && test.isPublished && incomplete > 0 && (
          <span className="text-xs text-amber-800">
            {incomplete} question{incomplete === 1 ? " is" : "s are"} incomplete. Saving will be refused until {incomplete === 1 ? "it is" : "they are"} fixed.
          </span>
        )}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending && !confirmingDelete ? "Saving…" : "Save test"}
        </button>
      </div>
    </div>
  );

  const card = "rounded-xl border border-line bg-surface p-5";
  const heading = "font-display text-sm font-semibold text-ink";

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="full"
      title={test ? `Practice test: ${test.title || "Untitled"}` : "Practice test"}
      description="The test card, the instructions, the questions and the solutions all come from this page."
      footer={footer}
    >
      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load this test: {loadError}</p>}
      {!test && !loadError && <p className="text-sm text-ink-soft">Loading the test…</p>}

      {test && (
        <div className="space-y-5">
          <section className={card} aria-labelledby="pt-settings">
            <h3 id="pt-settings" className={heading}>Settings</h3>
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <label htmlFor="pt-title" className="block text-xs font-semibold text-ink">Title <span className="text-brand">*</span></label>
                <input id="pt-title" maxLength={200} value={test.title} onChange={(e) => set("title", e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor="pt-kind" className="block text-xs font-semibold text-ink">Kind</label>
                <select id="pt-kind" value={test.kind} onChange={(e) => set("kind", e.target.value as AdminPracticeTest["kind"])} className={input}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pt-minutes" className="block text-xs font-semibold text-ink">Total time (minutes)</label>
                <input id="pt-minutes" type="number" min={0} max={600} value={test.totalMinutes} onChange={(e) => set("totalMinutes", Math.max(0, Math.min(600, Math.floor(Number(e.target.value) || 0))))} className={input} />
                <p className="mt-1 text-xs text-ink-faint">0 means untimed.</p>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label htmlFor="pt-summary" className="block text-xs font-semibold text-ink">Summary</label>
                <textarea id="pt-summary" rows={2} maxLength={400} value={test.summary} onChange={(e) => set("summary", e.target.value)} className={input} />
                <p className="mt-1 text-xs text-ink-faint">One or two lines on the card and the instructions screen. {test.summary.length}/400</p>
              </div>
              <div>
                <label htmlFor="pt-attempts" className="block text-xs font-semibold text-ink">Attempts allowed</label>
                <input id="pt-attempts" type="number" min={1} max={100} value={test.attemptsAllowed ?? ""} placeholder="Unlimited" onChange={(e) => set("attemptsAllowed", e.target.value === "" ? null : Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))))} className={input} />
              </div>
              <div className="md:col-span-2 xl:col-span-2">
                <label htmlFor="pt-langs" className="block text-xs font-semibold text-ink">Languages</label>
                <input id="pt-langs" value={test.languages.join(", ")} onChange={(e) => set("languages", e.target.value.split(",").map((l) => l.trim()).filter(Boolean).length ? e.target.value.split(",").map((l) => l.trim()).filter(Boolean) : ["English"])} className={input} />
                <p className="mt-1 text-xs text-ink-faint">Separate with commas, e.g. English, Hindi.</p>
              </div>
              <div className="md:col-span-2 xl:col-span-2 flex flex-col justify-end gap-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-2.5 text-sm text-ink">
                  <input type="checkbox" checked={test.isFree} onChange={(e) => set("isFree", e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                  Free sample: no account needed
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-2.5 text-sm text-ink">
                  <input type="checkbox" checked={test.sectionLock} onChange={(e) => set("sectionLock", e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                  Lock sections: each has its own time and no going back
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand/40 bg-brand-soft px-4 py-2.5 text-sm font-medium text-ink md:col-span-2 xl:col-span-2 xl:self-end">
                <input type="checkbox" checked={test.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                Published: visible to candidates on the exam page
              </label>
            </div>
          </section>

          <section className={card} aria-labelledby="pt-import">
            <h3 id="pt-import" className={heading}>Import questions from a spreadsheet</h3>
            <p className="mt-2 max-w-3xl text-xs text-ink-faint">
              Fill in the template (one row per question), save it as CSV, and choose the file. The questions are added below for you to check; nothing is stored until you save the test.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={downloadTemplate} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
                Download the template
              </button>
              <label className="cursor-pointer rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">
                Choose a CSV file
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => importFile(e.target.files?.[0])} />
              </label>
            </div>
            {importNote && (
              <div role="status" className="mt-3 text-sm">
                <p className={importNote.added > 0 ? "text-ink" : "text-red-700"}>
                  {importNote.added > 0 ? `${importNote.added} question${importNote.added === 1 ? "" : "s"} added.` : "No questions were added."}
                </p>
                {importNote.problems.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
                    {importNote.problems.slice(0, 10).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                    {importNote.problems.length > 10 && <li>…and {importNote.problems.length - 10} more.</li>}
                  </ul>
                )}
              </div>
            )}
          </section>

          {test.sections.map((section, si) => (
            <section key={si} className={card} aria-label={`Section ${si + 1}`}>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-56 flex-1">
                  <label htmlFor={`pt-s-${si}`} className="block text-xs font-semibold text-ink">Section {si + 1} name</label>
                  <input id={`pt-s-${si}`} maxLength={60} value={section.label} onChange={(e) => setSection(si, { label: e.target.value })} className={input} />
                </div>
                {test.sectionLock && (
                  <div className="w-40">
                    <label htmlFor={`pt-sm-${si}`} className="block text-xs font-semibold text-ink">Section time (min)</label>
                    <input id={`pt-sm-${si}`} type="number" min={1} max={600} value={section.durationMinutes ?? ""} onChange={(e) => setSection(si, { durationMinutes: e.target.value === "" ? null : Math.max(1, Math.min(600, Math.floor(Number(e.target.value) || 1))) })} className={input} />
                  </div>
                )}
                <p className="pb-2 text-xs text-ink-soft">{section.questions.length} question{section.questions.length === 1 ? "" : "s"}</p>
                {test.sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      edit((t) => ({ ...t, sections: t.sections.filter((_, i) => i !== si) }));
                      setOpen(null);
                    }}
                    className="mb-0.5 rounded-lg border border-line px-3 py-2 text-xs text-ink-soft hover:border-red-700 hover:text-red-700"
                  >
                    Remove section
                  </button>
                )}
              </div>

              <ol className="mt-4 space-y-2">
                {section.questions.map((q, qi) => {
                  const isOpen = open?.s === si && open.q === qi;
                  const problem = problemWith(q);
                  return (
                    <li key={qi} className="rounded-lg border border-line bg-bg">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : { s: si, q: qi })}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      >
                        <span className="w-8 shrink-0 text-sm font-semibold text-ink-soft">{qi + 1}.</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{q.stem.trim() || "New question"}</span>
                        <span className="hidden shrink-0 text-xs text-ink-faint sm:inline">{typeLabel(q.type)} · {q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                        {problem && <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">{problem}</span>}
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-line p-4">
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                            <div className="col-span-2 xl:col-span-2">
                              <label htmlFor={`q-type-${si}-${qi}`} className="block text-xs font-semibold text-ink">Answer type</label>
                              <select id={`q-type-${si}-${qi}`} value={q.type} onChange={(e) => changeType(si, qi, q, e.target.value as AdminPracticeQuestion["type"])} className={input}>
                                <option value="mcq-single">Single answer (pick one)</option>
                                <option value="mcq-multi">Multiple answers (pick all that apply)</option>
                                <option value="tita">Type-in answer (a number)</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label htmlFor={`q-topic-${si}-${qi}`} className="block text-xs font-semibold text-ink">Topic</label>
                              <input id={`q-topic-${si}-${qi}`} maxLength={100} value={q.topic} placeholder={section.label} onChange={(e) => setQuestion(si, qi, { topic: e.target.value })} className={input} />
                            </div>
                            <div>
                              <label htmlFor={`q-diff-${si}-${qi}`} className="block text-xs font-semibold text-ink">Difficulty</label>
                              <select id={`q-diff-${si}-${qi}`} value={q.difficulty} onChange={(e) => setQuestion(si, qi, { difficulty: e.target.value as AdminPracticeQuestion["difficulty"] })} className={input}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`q-time-${si}-${qi}`} className="block text-xs font-semibold text-ink">Expected seconds</label>
                              <input id={`q-time-${si}-${qi}`} type="number" min={10} max={3600} value={q.expectedSeconds} onChange={(e) => setQuestion(si, qi, { expectedSeconds: Math.max(10, Math.min(3600, Math.floor(Number(e.target.value) || 120))) })} className={input} />
                            </div>
                            <div>
                              <label htmlFor={`q-marks-${si}-${qi}`} className="block text-xs font-semibold text-ink">Marks</label>
                              <input id={`q-marks-${si}-${qi}`} type="number" min={0} max={100} step="0.25" value={q.marks} onChange={(e) => setQuestion(si, qi, { marks: Math.max(0, Number(e.target.value) || 0) })} className={input} />
                            </div>
                            <div>
                              <label htmlFor={`q-neg-${si}-${qi}`} className="block text-xs font-semibold text-ink">Marks lost if wrong</label>
                              <input id={`q-neg-${si}-${qi}`} type="number" min={0} max={100} step="0.25" value={q.negativeMarks} onChange={(e) => setQuestion(si, qi, { negativeMarks: Math.max(0, Number(e.target.value) || 0) })} className={input} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                              <label htmlFor={`q-passage-${si}-${qi}`} className="block text-xs font-semibold text-ink">Passage (optional)</label>
                              <textarea id={`q-passage-${si}-${qi}`} rows={5} maxLength={10000} value={q.passage} onChange={(e) => setQuestion(si, qi, { passage: e.target.value })} className={input} />
                              <p className="mt-1 text-xs text-ink-faint">A reading passage, caselet or figure. Questions with identical passage text share one passage.</p>
                              <FigurePreviews text={q.passage} onChange={(passage) => setQuestion(si, qi, { passage })} />
                              <FigureButton onAdd={(src, alt, size) => setQuestion(si, qi, { passage: withFigure(q.passage, src, alt, size) })} />
                            </div>
                            <div>
                              <label htmlFor={`q-stem-${si}-${qi}`} className="block text-xs font-semibold text-ink">Question <span className="text-brand">*</span></label>
                              <textarea id={`q-stem-${si}-${qi}`} rows={5} maxLength={5000} value={q.stem} onChange={(e) => setQuestion(si, qi, { stem: e.target.value })} className={input} />
                              <p className="mt-1 text-xs text-ink-faint">A blank line starts a new paragraph.</p>
                              <FigurePreviews text={q.stem} onChange={(stem) => setQuestion(si, qi, { stem })} />
                              <FigureButton onAdd={(src, alt, size) => setQuestion(si, qi, { stem: withFigure(q.stem, src, alt, size) })} />
                            </div>
                          </div>

                          {q.type === "tita" ? (
                            <div className="grid max-w-xl grid-cols-2 gap-4">
                              <div>
                                <label htmlFor={`q-ans-${si}-${qi}`} className="block text-xs font-semibold text-ink">Correct number <span className="text-brand">*</span></label>
                                <input id={`q-ans-${si}-${qi}`} type="number" step="any" value={q.answerValue ?? ""} onChange={(e) => setQuestion(si, qi, { answerValue: e.target.value === "" ? null : Number(e.target.value) })} className={input} />
                              </div>
                              <div>
                                <label htmlFor={`q-tol-${si}-${qi}`} className="block text-xs font-semibold text-ink">Allowed difference</label>
                                <input id={`q-tol-${si}-${qi}`} type="number" min={0} step="any" value={q.tolerance} onChange={(e) => setQuestion(si, qi, { tolerance: Math.max(0, Number(e.target.value) || 0) })} className={input} />
                                <p className="mt-1 text-xs text-ink-faint">0 means exact.</p>
                              </div>
                            </div>
                          ) : (
                            <fieldset>
                              <legend className="text-xs font-semibold text-ink">
                                Options <span className="font-normal text-ink-soft">({q.type === "mcq-single" ? "choose the one correct option" : "tick every correct option"})</span>
                              </legend>
                              <ul className="mt-2 space-y-2">
                                {q.options.map((option, oi) => (
                                  <li key={oi} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <input
                                      type={q.type === "mcq-single" ? "radio" : "checkbox"}
                                      name={`q-correct-${si}-${qi}`}
                                      aria-label={`Option ${LETTERS[oi]} is correct`}
                                      checked={q.correctOptions.includes(oi)}
                                      onChange={() => toggleCorrect(si, qi, q, oi)}
                                      className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                                    />
                                    <span className="w-5 shrink-0 text-sm font-semibold text-ink-soft">{LETTERS[oi]}</span>
                                    {/* A textarea, not an input: an option can hold a figure line on its own line. */}
                                    <textarea
                                      aria-label={`Option ${LETTERS[oi]} text`}
                                      rows={Math.min(3, option.split("\n").length)}
                                      value={option}
                                      onChange={(e) => setQuestion(si, qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                                      className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                                    />
                                    <FigureButton compact onAdd={(src, alt, size) => setQuestion(si, qi, { options: q.options.map((o, i) => (i === oi ? withFigure(o, src, alt, size) : o)) })} />
                                    <button type="button" aria-label={`Remove option ${LETTERS[oi]}`} disabled={q.options.length <= 2} onClick={() => removeOption(si, qi, q, oi)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">
                                      Remove
                                    </button>
                                    <div className="w-full pl-12">
                                      <FigurePreviews text={option} onChange={(next) => setQuestion(si, qi, { options: q.options.map((o, i) => (i === oi ? next : o)) })} />
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              {q.options.length < MAX_OPTIONS && (
                                <button type="button" onClick={() => setQuestion(si, qi, { options: [...q.options, ""] })} className="mt-2 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                                  Add an option
                                </button>
                              )}
                            </fieldset>
                          )}

                          <div>
                            <label htmlFor={`q-sol-${si}-${qi}`} className="block text-xs font-semibold text-ink">Solution (shown in the results)</label>
                            <textarea id={`q-sol-${si}-${qi}`} rows={3} maxLength={5000} value={q.solution} onChange={(e) => setQuestion(si, qi, { solution: e.target.value })} className={input} />
                            <FigurePreviews text={q.solution} onChange={(solution) => setQuestion(si, qi, { solution })} />
                            <FigureButton onAdd={(src, alt, size) => setQuestion(si, qi, { solution: withFigure(q.solution, src, alt, size) })} />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                            <button type="button" disabled={qi === 0} onClick={() => moveQuestion(si, qi, -1)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Move up</button>
                            <button type="button" disabled={qi === section.questions.length - 1} onClick={() => moveQuestion(si, qi, 1)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Move down</button>
                            <button type="button" onClick={() => duplicateQuestion(si, qi)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brand">Duplicate</button>
                            <button type="button" onClick={() => removeQuestion(si, qi)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Delete question</button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => addQuestion(si, "mcq-single")} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">Add a multiple-choice question</button>
                <button type="button" onClick={() => addQuestion(si, "tita")} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">Add a type-in question</button>
              </div>
            </section>
          ))}

          {test.sections.length < 10 && (
            <button
              type="button"
              onClick={() => edit((t) => ({ ...t, sections: [...t.sections, { label: `Section ${t.sections.length + 1}`, durationMinutes: null, questions: [] }] }))}
              className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
            >
              Add a section
            </button>
          )}

          <p className="text-xs text-ink-faint">{total} question{total === 1 ? "" : "s"} in this test.</p>
        </div>
      )}
    </AdminModal>
  );
}
