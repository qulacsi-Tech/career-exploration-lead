"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProgramRecord, saveRecommendedPrograms } from "@/lib/admin-actions";
import type { AdminProgram, ProgramInput } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";

/*
  One programme: add or edit, in one dialog.

  The name, the university, the online and on-campus duration and fees, whether the
  programme is active and whether it is in the homepage row. One Save keeps it all.

  The page address is made from the name when the programme is created and stays the same
  after a rename. The university is typed, with the directory's colleges offered as you type:
  choosing one links the programme to that college's page; any other name works too.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export const MAX_ROW = 6;

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const BLANK: ProgramInput = {
  name: "",
  universityName: "",
  universitySlug: "",
  onlineDuration: "",
  onlineFees: "",
  onlineFeesNote: "",
  onCampusDuration: "",
  onCampusFees: "",
  isActive: true,
  image: "",
};

function toInput(p: AdminProgram): ProgramInput {
  return {
    name: p.name,
    universityName: p.universityName,
    universitySlug: p.universitySlug,
    onlineDuration: p.onlineDuration ?? "",
    onlineFees: p.onlineFees ?? "",
    onlineFeesNote: p.onlineFeesNote ?? "",
    onCampusDuration: p.onCampusDuration ?? "",
    onCampusFees: p.onCampusFees ?? "",
    isActive: p.isActive,
    image: p.image,
  };
}

function Text({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  required,
  list,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  required?: boolean;
  list?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <input id={id} list={list} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function ProgramModal({
  program,
  rowSlugs,
  colleges,
  onClose,
}: {
  /** The programme to edit, or null to add a new one. */
  program: AdminProgram | null;
  /** The programmes in the homepage row now, in order. */
  rowSlugs: string[];
  /** Directory colleges, offered as universities. */
  colleges: { slug: string; name: string }[];
  /** `message` is set when something was saved or added. */
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const editing = program;
  const wasInRow = program ? rowSlugs.includes(program.slug) : false;
  const rowFull = rowSlugs.length >= MAX_ROW;
  const cannotShow = !wasInRow && rowFull;

  const [draft, setDraft] = useState<ProgramInput>(() => (program ? toInput(program) : BLANK));
  // A new programme joins the homepage row when there is room, so adding one is visible at once.
  const [inRow, setInRow] = useState<boolean>(program ? wasInRow : !rowFull);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProgramInput>(key: K, value: ProgramInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const setUniversity = (name: string) => {
    const match = colleges.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setDraft((d) => ({ ...d, universityName: name, universitySlug: match ? match.slug : slugify(name) }));
    setError(null);
  };

  const canSave = draft.name.trim().length >= 2 && draft.universityName.trim().length >= 2 && draft.universitySlug.length >= 2;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const saved = await saveProgramRecord(editing ? editing.slug : null, draft);
      if ("error" in saved) {
        setError(saved.error);
        return;
      }
      const shouldShow = inRow && !cannotShow;
      if (shouldShow !== rowSlugs.includes(saved.slug)) {
        const next = shouldShow ? [...rowSlugs, saved.slug] : rowSlugs.filter((s) => s !== saved.slug);
        const result = await saveRecommendedPrograms(next);
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
        {!canSave && <span className="text-xs text-amber-800">Enter the programme name and the university.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : editing ? "Save" : "Add programme"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="lg"
      title={editing ? `Edit ${editing.name}` : "Add programme"}
      description="The programme's details and photo, whether it is active, and whether it is in the homepage row."
      footer={footer}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Text id="prog-name" label="Programme name" required max={500} value={draft.name} onChange={(v) => set("name", v)} hint={editing ? "The page address stays the same after a rename." : "Becomes the page address."} />
          <div>
            <Text id="prog-uni" label="University" required max={500} value={draft.universityName} onChange={setUniversity} list="prog-uni-options" hint="Pick a college from the list, or type any name." />
            <datalist id="prog-uni-options">
              {colleges.map((c) => (
                <option key={c.slug} value={c.name} />
              ))}
            </datalist>
          </div>
        </div>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-xs font-semibold text-ink">Online</legend>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Text id="prog-od" label="Duration" max={100} value={draft.onlineDuration} onChange={(v) => set("onlineDuration", v)} hint="e.g. 8 months." />
            <Text id="prog-of" label="Fees" max={200} value={draft.onlineFees} onChange={(v) => set("onlineFees", v)} hint="e.g. INR 4,00,000." />
            <Text id="prog-on" label="Fees note" max={200} value={draft.onlineFeesNote} onChange={(v) => set("onlineFeesNote", v)} hint="e.g. (including taxes)." />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-xs font-semibold text-ink">On campus</legend>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Text id="prog-cd" label="Duration" max={100} value={draft.onCampusDuration} onChange={(v) => set("onCampusDuration", v)} hint="e.g. 1 year." />
            <Text id="prog-cf" label="Fees" max={200} value={draft.onCampusFees} onChange={(v) => set("onCampusFees", v)} hint="e.g. USD 17,000 (indicative)." />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-xs font-semibold text-ink">Photo</legend>
          <ImageUploadField kind="program" value={draft.image} onChange={(v) => set("image", v)} fallbackNote="No photo. The card uses the site's shared photo set." />
        </fieldset>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
            <span className="text-sm text-ink">
              Active
              <span className="mt-0.5 block text-xs text-ink-soft">Inactive programmes are kept here but hidden from the site.</span>
            </span>
          </label>
          <label className={`flex items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3 ${cannotShow ? "opacity-70" : "cursor-pointer"}`}>
            <input type="checkbox" checked={inRow && !cannotShow} disabled={cannotShow} onChange={(e) => setInRow(e.target.checked)} className="h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
            <span className="text-sm text-ink">
              Show in the homepage Recommended row
              {cannotShow && <span className="mt-0.5 block text-xs text-ink-soft">The row holds {MAX_ROW} programmes and is full. Untick one in the table first.</span>}
            </span>
          </label>
        </div>
      </div>
    </AdminModal>
  );
}
