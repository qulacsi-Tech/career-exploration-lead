"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExamCard, saveHomeCopy, saveTopExams, updateExamCard } from "@/lib/admin-actions";
import type { AdminExam, ExamInput } from "@/lib/api";
import type { ExamCardCopy } from "@/lib/home-copy";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";

/*
  One exam, one full-width form in five tabs:

    Details       name, who runs it, level, mode, website, description
    Dates & fees  registration, exam date, fee, how often
    Pattern       duration and sections
    Photo         the card's picture
    Card wording  the fixed words on every exam card (shared, not per exam)

  Add and edit are the same screen. One Save at the bottom saves the exam, the card
  wording if it was changed, and whether the exam is in the homepage row.

  The page address is made from the name when the exam is created and stays the same
  after a rename, so links to it keep working.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export const MAX_TOP_EXAMS = 6;
const MAX_SECTIONS = 30;

type TabId = "details" | "dates" | "pattern" | "photo" | "wording";

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "dates", label: "Dates & fees" },
  { id: "pattern", label: "Pattern" },
  { id: "photo", label: "Photo" },
  { id: "wording", label: "Card wording" },
];

const BLANK: ExamInput = {
  name: "",
  conductingBody: "",
  level: "National",
  mode: "Online",
  description: "",
  registrationCloses: "",
  examDate: "",
  applicationFee: "",
  frequency: "",
  officialSite: "",
  durationMinutes: null,
  sections: [],
  image: "",
};

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
    image: e.image,
  };
}

function Text({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  multiline,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={5} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
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

export function ExamModal({
  exam,
  topSlugs,
  wording,
  onClose,
}: {
  /** The exam to edit, or null to add a new one. */
  exam: AdminExam | null;
  /** The exams in the homepage row now, in order. */
  topSlugs: string[];
  /** The fixed words on every exam card. Saved with the exam when changed. */
  wording: ExamCardCopy;
  /** Called when the form closes. `message` is set when something was saved, added or deleted. */
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const editing = exam;
  const wasShown = exam ? topSlugs.includes(exam.slug) : false;
  const rowFull = topSlugs.length >= MAX_TOP_EXAMS;

  const [tab, setTab] = useState<TabId>("details");
  const [draft, setDraft] = useState<ExamInput>(() => (exam ? toInput(exam) : BLANK));
  // A new exam joins the homepage row when there is room, so adding one is visible at once.
  const [show, setShow] = useState<boolean>(exam ? wasShown : !rowFull);
  const [wordingDraft, setWordingDraft] = useState<ExamCardCopy>(wording);
  // What the server holds for the wording, so a retry after a failed save does not resend it.
  const [savedWording, setSavedWording] = useState<ExamCardCopy>(wording);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ExamInput>(key: K, value: ExamInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };
  const setWording = (key: keyof ExamCardCopy, value: string) => {
    setWordingDraft((w) => ({ ...w, [key]: value }));
    setError(null);
  };

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const hasSection = (text: string) => draft.sections.some((s) => same(s, text));
  const addSection = () => {
    const text = typed.trim();
    setTyped("");
    if (!text || hasSection(text) || draft.sections.length >= MAX_SECTIONS) return;
    set("sections", [...draft.sections, text]);
  };

  const canSave =
    draft.name.trim().length >= 2 && draft.conductingBody.trim().length >= 2 && draft.description.trim().length >= 1;
  const wordingChanged = (Object.keys(wordingDraft) as (keyof ExamCardCopy)[]).some((k) => wordingDraft[k] !== savedWording[k]);
  const wordingValid = Object.values(wordingDraft).every((v) => v.trim() !== "");
  // Ticking a ninth exam would be refused by the server; say so before it gets that far.
  const cannotShow = !wasShown && rowFull;

  const save = () => {
    setError(null);
    startTransition(async () => {
      // The wording is shared and simple, so it goes first: if it is refused, nothing else has changed.
      if (wordingChanged) {
        if (!wordingValid) {
          setTab("wording");
          setError("Every word on the card needs some text.");
          return;
        }
        const result = await saveHomeCopy("examCard", { ...wordingDraft });
        if ("error" in result) {
          setTab("wording");
          setError(result.error);
          return;
        }
        setSavedWording(wordingDraft);
      }

      let slug: string;
      if (editing) {
        const result = await updateExamCard(editing.slug, draft);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        slug = editing.slug;
      } else {
        const created = await createExamCard(draft);
        if ("error" in created) {
          setError(created.error);
          return;
        }
        slug = created.slug;
      }

      const shouldShow = show && !cannotShow;
      const isShown = topSlugs.includes(slug);
      if (shouldShow !== isShown) {
        const next = shouldShow ? [...topSlugs, slug] : topSlugs.filter((s) => s !== slug);
        const result = await saveTopExams(next);
        if ("error" in result) {
          router.refresh();
          setError(`${draft.name.trim()} was saved, but the homepage row could not be updated: ${result.error}`);
          return;
        }
      }

      router.refresh();
      onClose(editing ? `${draft.name.trim()} saved.` : `${draft.name.trim()} was added.`);
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {!canSave && <span className="text-xs text-amber-800">Enter a name, who runs it and a description on the Details tab.</span>}
        {canSave && wordingChanged && <span className="text-xs text-ink-soft">Card wording changed. It applies to every exam card.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : editing ? "Save" : "Add exam"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="full"
      title={editing ? `Edit ${editing.name}` : "Add exam"}
      description="Everything about this exam and its homepage card. One Save at the bottom keeps all the tabs."
      footer={footer}
    >
      <div role="tablist" aria-label="Exam sections" className="-mt-1 mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.id;
          const flag = t.id === "details" && !canSave ? "incomplete" : t.id === "wording" && wordingChanged ? "changed" : null;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`exam-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`exam-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
              {flag && (
                <span className={`h-2 w-2 rounded-full ${flag === "incomplete" ? "bg-amber-500" : "bg-brand"}`} title={flag === "incomplete" ? "Needs a name, a body and a description" : "Unsaved change"} />
              )}
            </button>
          );
        })}
      </div>

      {tab === "details" && (
        <div role="tabpanel" id="exam-panel-details" aria-labelledby="exam-tab-details" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Text id="exam-name" label="Exam name" required max={500} value={draft.name} onChange={(v) => set("name", v)} hint={editing ? "The page address stays the same after a rename." : "Becomes the page address."} />
            <Text id="exam-body" label="Conducting body" required max={200} value={draft.conductingBody} onChange={(v) => set("conductingBody", v)} />
            <div>
              <label htmlFor="exam-level" className="block text-xs font-semibold text-ink">
                Level
              </label>
              <select id="exam-level" value={draft.level} onChange={(e) => set("level", e.target.value as ExamInput["level"])} className={input}>
                <option value="National">National</option>
                <option value="State">State</option>
              </select>
            </div>
            <div>
              <label htmlFor="exam-mode" className="block text-xs font-semibold text-ink">
                Mode
              </label>
              <select id="exam-mode" value={draft.mode} onChange={(e) => set("mode", e.target.value)} className={input}>
                <option value="">Not set</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Text id="exam-description" label="Description" required multiline max={2000} value={draft.description} onChange={(v) => set("description", v)} hint="Shown on the exam page and under the name on the card." />
            </div>
            <Text id="exam-site" label="Official site" max={300} value={draft.officialSite} onChange={(v) => set("officialSite", v)} hint="e.g. iimcat.ac.in." />
          </div>

          <label className={`flex max-w-xl items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3 ${cannotShow ? "opacity-70" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={show && !cannotShow}
              disabled={cannotShow}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
            />
            <span className="text-sm text-ink">
              Show this exam in the homepage Top Exams row
              {cannotShow && (
                <span className="mt-0.5 block text-xs text-ink-soft">
                  The row holds {MAX_TOP_EXAMS} exams and is full. Untick one in the list first.
                </span>
              )}
            </span>
          </label>
        </div>
      )}

      {tab === "dates" && (
        <div role="tabpanel" id="exam-panel-dates" aria-labelledby="exam-tab-dates" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Text id="exam-reg" label="Registration closes" max={50} value={draft.registrationCloses} onChange={(v) => set("registrationCloses", v)} hint="e.g. 26 Mar 2027." />
            <Text id="exam-date" label="Exam date" max={50} value={draft.examDate} onChange={(v) => set("examDate", v)} hint="e.g. May 2027." />
            <Text id="exam-fee" label="Application fee" max={100} value={draft.applicationFee} onChange={(v) => set("applicationFee", v)} hint="e.g. ₹2,500." />
            <Text id="exam-frequency" label="How often" max={100} value={draft.frequency} onChange={(v) => set("frequency", v)} hint="e.g. Once a year." />
          </div>
        </div>
      )}

      {tab === "pattern" && (
        <div role="tabpanel" id="exam-panel-pattern" aria-labelledby="exam-tab-pattern" className="space-y-5">
          <div className="max-w-xs">
            <label htmlFor="exam-duration" className="block text-xs font-semibold text-ink">
              Duration (minutes)
            </label>
            <input
              id="exam-duration"
              type="number"
              min={0}
              max={1440}
              value={draft.durationMinutes ?? ""}
              onChange={(e) => set("durationMinutes", e.target.value === "" ? null : Math.max(0, Math.min(1440, Math.floor(Number(e.target.value) || 0))))}
              className={input}
            />
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-ink">
              Sections <span className="font-normal text-ink-soft">({draft.sections.length} of {MAX_SECTIONS})</span>
            </legend>
            <p className="mt-1 text-xs text-ink-faint">The papers or parts of the exam, such as Verbal or Quant. Type one and press Enter.</p>
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
              <label htmlFor="exam-section" className="sr-only">
                Add a section
              </label>
              <input
                id="exam-section"
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
      )}

      {tab === "photo" && (
        <div role="tabpanel" id="exam-panel-photo" aria-labelledby="exam-tab-photo">
          <ImageUploadField kind="exam" value={draft.image} onChange={(v) => set("image", v)} fallbackNote="No photo. The card shows a plain background." />
        </div>
      )}

      {tab === "wording" && (
        <div role="tabpanel" id="exam-panel-wording" aria-labelledby="exam-tab-wording" className="space-y-5">
          <p className="max-w-3xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            These words repeat on <strong>every</strong> exam card, not only this one. Changing them here changes all cards when you save.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Text id="ew-cutoff" label="Cutoff link" max={30} value={wordingDraft.cutoffLabel} onChange={(v) => setWording("cutoffLabel", v)} />
            <Text id="ew-key" label="Answer key link" max={30} value={wordingDraft.answerKeyLabel} onChange={(v) => setWording("answerKeyLabel", v)} />
            <Text id="ew-button" label="Card button" max={30} value={wordingDraft.buttonLabel} onChange={(v) => setWording("buttonLabel", v)} />
            <Text id="ew-viewall" label="View all button under the row" max={30} value={wordingDraft.viewAllLabel} onChange={(v) => setWording("viewAllLabel", v)} />
          </div>
        </div>
      )}
    </AdminModal>
  );
}
