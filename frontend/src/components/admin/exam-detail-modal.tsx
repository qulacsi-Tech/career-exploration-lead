"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExamCard } from "@/lib/admin-actions";
import type { AdminExam, ExamFaq, ExamInput } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { DateField } from "@/components/admin/date-field";
import { PracticeTestEditor } from "@/components/admin/practice-test-editor";
import { PracticeTestsTab } from "@/components/admin/practice-tests-tab";

/*
  The content of one exam's own page (/exams/<slug>), in tabs that follow the page:

    About            the description and who can sit the exam (eligibility)
    Dates & links    registration, exam date, mode, how often, fee, official site
    Pattern          duration, the sections, and the syllabus
    FAQs             questions and answers shown at the end of the page
    Practice tests   the mock tests for the exam: settings, questions, answers, solutions
    Colleges & cutoffs  worked out by the site from the colleges that accept the exam

  Opened with the eye button on an exam row. One Save keeps every tab. The card on the
  homepage (photo, name, whether it shows) is in the Edit form, not here.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const MAX_SECTIONS = 30;
const MAX_FAQS = 20;

type TabId = "about" | "dates" | "pattern" | "faqs" | "practice" | "colleges";

const TABS: { id: TabId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "dates", label: "Dates & links" },
  { id: "pattern", label: "Pattern & syllabus" },
  { id: "faqs", label: "FAQs" },
  { id: "practice", label: "Practice tests" },
  { id: "colleges", label: "Colleges & cutoffs" },
];

function toInput(e: AdminExam): ExamInput {
  return {
    name: e.name,
    conductingBody: e.conductingBody,
    level: e.level,
    mode: e.mode,
    description: e.description,
    registrationCloses: e.registrationCloses,
    examDate: e.examDate,
    applicationFee: e.applicationFee,
    frequency: e.frequency,
    officialSite: e.officialSite,
    durationMinutes: e.durationMinutes,
    sections: e.sections,
    stream: e.stream,
    eligibility: e.eligibility,
    syllabus: e.syllabus,
    faqs: e.faqs,
    image: e.image,
  };
}

function Field({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  rows,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input id={id} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function ExamDetailModal({
  exam,
  onClose,
}: {
  exam: AdminExam;
  /** `message` is set when the exam was saved, so the page can say so. */
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("about");
  const [draft, setDraft] = useState<ExamInput>(() => toInput(exam));
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The practice test being edited. It takes the dialog's place while open, and the
  // exam's own unsaved changes stay here until it closes.
  const [editingTest, setEditingTest] = useState<string | null>(null);
  const [testsKey, setTestsKey] = useState(0);
  const [testsNote, setTestsNote] = useState<string | null>(null);

  const set = <K extends keyof ExamInput>(key: K, value: ExamInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const addSection = () => {
    const text = typed.trim();
    setTyped("");
    if (!text || draft.sections.some((s) => same(s, text)) || draft.sections.length >= MAX_SECTIONS) return;
    set("sections", [...draft.sections, text]);
  };

  const setFaq = (index: number, change: Partial<ExamFaq>) =>
    set("faqs", draft.faqs.map((f, i) => (i === index ? { ...f, ...change } : f)));
  const moveFaq = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.faqs.length) return;
    const next = [...draft.faqs];
    [next[index], next[target]] = [next[target], next[index]];
    set("faqs", next);
  };

  const incompleteFaqs = draft.faqs.filter((f) => (f.question.trim() === "") !== (f.answer.trim() === "")).length;
  const canSave = draft.description.trim().length >= 1;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateExamCard(exam.slug, draft);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(`${exam.name}: page content saved.`);
    });
  };

  if (editingTest) {
    return (
      <PracticeTestEditor
        slug={editingTest}
        examSlug={exam.slug}
        onClose={(message) => {
          setEditingTest(null);
          setTab("practice");
          if (message) {
            setTestsNote(message);
            setTestsKey((k) => k + 1);
          }
        }}
      />
    );
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <a href={`/exams/${exam.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
        View the live page
      </a>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {incompleteFaqs > 0 && (
          <span className="text-xs text-amber-800">
            {incompleteFaqs} FAQ{incompleteFaqs === 1 ? " has" : "s have"} only a question or only an answer, and will not be saved.
          </span>
        )}
        {!canSave && <span className="text-xs text-amber-800">The description cannot be empty.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="full"
      title={`Exam page: ${exam.name}`}
      description="The information shown on this exam's own page. One Save keeps every tab."
      footer={footer}
    >
      <div role="tablist" aria-label="Exam page sections" className="-mt-1 mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`examd-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`examd-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "faqs" && draft.faqs.length > 0 && <span className="rounded-full bg-bg-alt px-2 text-xs text-ink-soft">{draft.faqs.length}</span>}
            </button>
          );
        })}
      </div>

      {tab === "about" && (
        <div role="tabpanel" id="examd-panel-about" aria-labelledby="examd-tab-about" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field id="examd-description" label="About the exam" required rows={9} max={2000} value={draft.description} onChange={(v) => set("description", v)} hint="The paragraph under About on the page, and on the homepage card." />
          <Field id="examd-eligibility" label="Eligibility" rows={9} max={5000} value={draft.eligibility} onChange={(v) => set("eligibility", v)} hint="Who can sit the exam: qualification, marks, age. Optional. A blank line starts a new paragraph." />
        </div>
      )}

      {tab === "dates" && (
        <div role="tabpanel" id="examd-panel-dates" aria-labelledby="examd-tab-dates" className="space-y-5">
          <p className="text-sm text-ink-soft">Shown in the Key dates box beside the page.</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <DateField id="examd-reg" label="Registration closes" value={draft.registrationCloses} onChange={(v) => set("registrationCloses", v)} />
            <DateField id="examd-date" label="Exam date" value={draft.examDate} onChange={(v) => set("examDate", v)} />
            <div>
              <label htmlFor="examd-mode" className="block text-xs font-semibold text-ink">Mode</label>
              <select id="examd-mode" value={draft.mode} onChange={(e) => set("mode", e.target.value)} className={input}>
                <option value="">Not set</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <Field id="examd-frequency" label="How often" max={100} value={draft.frequency} onChange={(v) => set("frequency", v)} hint="e.g. Once a year." />
            <Field id="examd-fee" label="Application fee" max={100} value={draft.applicationFee} onChange={(v) => set("applicationFee", v)} hint="e.g. ₹2,500." />
            <Field id="examd-site" label="Official site" max={300} value={draft.officialSite} onChange={(v) => set("officialSite", v)} hint="e.g. iimcat.ac.in, without https://." />
          </div>
        </div>
      )}

      {tab === "pattern" && (
        <div role="tabpanel" id="examd-panel-pattern" aria-labelledby="examd-tab-pattern" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="max-w-xs">
              <label htmlFor="examd-duration" className="block text-xs font-semibold text-ink">Total duration (minutes)</label>
              <input
                id="examd-duration"
                type="number"
                min={0}
                max={1440}
                value={draft.durationMinutes ?? ""}
                onChange={(e) => set("durationMinutes", e.target.value === "" ? null : Math.max(0, Math.min(1440, Math.floor(Number(e.target.value) || 0))))}
                className={input}
              />
              <p className="mt-1 text-xs text-ink-faint">The pattern table splits it evenly across the sections.</p>
            </div>

            <fieldset>
              <legend className="text-xs font-semibold text-ink">
                Sections <span className="font-normal text-ink-soft">({draft.sections.length} of {MAX_SECTIONS})</span>
              </legend>
              <p className="mt-1 text-xs text-ink-faint">The rows of the Exam pattern table. Type one and press Enter.</p>
              {draft.sections.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {draft.sections.map((text) => (
                    <li key={text} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-alt py-1 pl-3 pr-1.5 text-sm text-ink">
                      {text}
                      <button type="button" aria-label={`Remove ${text}`} onClick={() => set("sections", draft.sections.filter((s) => !same(s, text)))} className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-700">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex max-w-xl gap-2">
                <label htmlFor="examd-section" className="sr-only">Add a section</label>
                <input
                  id="examd-section"
                  maxLength={60}
                  value={typed}
                  placeholder="e.g. Verbal Ability"
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSection();
                    }
                  }}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
                <button type="button" onClick={addSection} disabled={!typed.trim() || draft.sections.length >= MAX_SECTIONS} className="shrink-0 rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
                  Add
                </button>
              </div>
            </fieldset>
          </div>

          <Field id="examd-syllabus" label="Syllabus" rows={12} max={8000} value={draft.syllabus} onChange={(v) => set("syllabus", v)} hint="Topics by section. Optional. A blank line starts a new paragraph." />
        </div>
      )}

      {tab === "faqs" && (
        <div role="tabpanel" id="examd-panel-faqs" aria-labelledby="examd-tab-faqs" className="space-y-4">
          <p className="max-w-3xl text-sm text-ink-soft">
            Questions students ask about this exam, shown at the end of its page. Both the question and the answer are needed.
          </p>
          {draft.faqs.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No FAQs yet. Add the first one.</p>
          )}
          <ul className="space-y-3">
            {draft.faqs.map((faq, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <label htmlFor={`examd-q-${i}`} className="block text-xs font-semibold text-ink">Question {i + 1}</label>
                    <input id={`examd-q-${i}`} maxLength={300} value={faq.question} onChange={(e) => setFaq(i, { question: e.target.value })} className={input} />
                  </div>
                  <div>
                    <label htmlFor={`examd-a-${i}`} className="block text-xs font-semibold text-ink">Answer</label>
                    <textarea id={`examd-a-${i}`} rows={3} maxLength={2000} value={faq.answer} onChange={(e) => setFaq(i, { answer: e.target.value })} className={input} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" disabled={i === 0} onClick={() => moveFaq(i, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
                  <button type="button" disabled={i === draft.faqs.length - 1} onClick={() => moveFaq(i, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
                  <button type="button" onClick={() => set("faqs", draft.faqs.filter((_, n) => n !== i))} className="rounded-lg border border-line px-3 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          {draft.faqs.length < MAX_FAQS && (
            <button type="button" onClick={() => set("faqs", [...draft.faqs, { question: "", answer: "" }])} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">
              Add a FAQ
            </button>
          )}
        </div>
      )}

      {tab === "practice" && (
        <div role="tabpanel" id="examd-panel-practice" aria-labelledby="examd-tab-practice">
          <PracticeTestsTab examSlug={exam.slug} refreshKey={testsKey} note={testsNote} onEdit={setEditingTest} />
        </div>
      )}

      {tab === "colleges" && (
        <div role="tabpanel" id="examd-panel-colleges" aria-labelledby="examd-tab-colleges" className="max-w-3xl space-y-4 text-sm text-ink-soft">
          <p>
            These two parts of the page are filled in by the site, so there is nothing to type here:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Cutoffs by college</strong> lists the cutoff rows of every college that accepts this exam. Cutoffs are set on each college&apos;s own record.
            </li>
            <li>
              <strong className="text-ink">Colleges accepting {exam.name.replace(/\s*\(.*\)\s*/, "").trim()}</strong> lists the colleges whose accepted exams include it.
            </li>
          </ul>
          <p>
            To change which colleges appear, add this exam to a college&apos;s accepted exams under{" "}
            <a href="/admin/colleges" className="font-medium text-brand hover:underline">
              Content → Colleges
            </a>
            . Practice tests have their own tab.
          </p>
        </div>
      )}
    </AdminModal>
  );
}
