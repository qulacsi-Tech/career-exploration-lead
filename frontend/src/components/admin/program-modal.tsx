"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProgramRecord, saveRecommendedPrograms } from "@/lib/admin-actions";
import type { AdminProgram, ProgramInput, ProgramSourceCourse } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { DurationField, FeesField } from "@/components/admin/duration-fees-fields";
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
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3.5 py-3 text-base text-ink focus:border-brand focus:outline-none";

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
  courses,
  takenSlugs,
  onClose,
}: {
  /** The programme to edit, or null to add a new one. */
  program: AdminProgram | null;
  /** The programmes in the homepage row now, in order. */
  rowSlugs: string[];
  /** Directory colleges, offered as universities. */
  colleges: { slug: string; name: string }[];
  /** Courses colleges already offer. A new programme is picked from these. */
  courses: ProgramSourceCourse[];
  /** The slugs programmes already use. */
  takenSlugs: string[];
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

  // A new programme starts from an existing course. Nothing shows below the picker until one is chosen.
  const [source, setSource] = useState<ProgramSourceCourse | null>(null);
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState<string | undefined>(undefined);

  const isOnline = (mode: string) => /online|distance/i.test(mode);
  const usable = (src: string) => src.startsWith("/api/uploads/") || src.startsWith("/images/");
  // The page address: the course's name, or the name with the college when another programme has it.
  const addressFor = (course: ProgramSourceCourse) => {
    const base = slugify(course.name);
    return takenSlugs.includes(base) ? slugify(`${course.name} ${course.collegeName}`) : base;
  };
  const isTaken = (course: ProgramSourceCourse) => takenSlugs.includes(slugify(`${course.name} ${course.collegeName}`));

  const pick = (course: ProgramSourceCourse) => {
    const online = isOnline(course.mode);
    setSource(course);
    setAddress(addressFor(course));
    setDraft((d) => ({
      ...d,
      name: course.name,
      universityName: course.collegeName,
      universitySlug: course.collegeSlug,
      onlineDuration: online ? course.duration : "",
      onlineFees: online ? course.fees : "",
      onCampusDuration: online ? "" : course.duration,
      onCampusFees: online ? "" : course.fees,
      // The college's own photo to begin with; the Photo box below replaces it.
      image: usable(course.collegeImage) ? course.collegeImage : "",
    }));
    setError(null);
  };

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = courses
    .filter((c) => {
      const hay = `${c.name} ${c.collegeName} ${c.mode} ${c.duration}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .slice(0, 50);

  const set = <K extends keyof ProgramInput>(key: K, value: ProgramInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const setUniversity = (name: string) => {
    const match = colleges.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setDraft((d) => ({ ...d, universityName: name, universitySlug: match ? match.slug : slugify(name) }));
    setError(null);
  };

  const picking = !editing && source === null;
  const canSave = !picking && draft.name.trim().length >= 2 && draft.universityName.trim().length >= 2 && draft.universitySlug.length >= 2;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const saved = await saveProgramRecord(editing ? editing.slug : null, draft, address);
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
        {!canSave && <span className="text-xs text-amber-800">{picking ? "Choose a course to start from." : "Enter the programme name and the university."}</span>}
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
      size="wide"
      title={editing ? `Edit ${editing.name}` : "Add programme"}
      description={editing ? "The programme's details and photo, whether it is active, and whether it is in the homepage row." : "Pick a course a college already offers. Its details come across, and you add whatever is missing."}
      footer={footer}
    >
      <div className="space-y-5">
        {!editing && (
          <div>
            <label htmlFor="prog-search" className="block text-xs font-semibold text-ink">
              Course <span className="text-brand">*</span>
            </label>
            {source ? (
              <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2.5">
                <p className="min-w-0 text-sm text-ink">
                  <span className="font-semibold">{source.name}</span>
                  <span className="text-ink-soft"> · {source.collegeName} · {source.mode}</span>
                </p>
                <button type="button" onClick={() => { setSource(null); setQuery(""); }} className="shrink-0 rounded-md border border-line bg-bg px-2.5 py-1 text-xs text-ink-soft hover:border-brand hover:text-brand">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input id="prog-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by course, college, mode or duration" className={input} autoComplete="off" />
                <ul role="listbox" aria-label="Courses" className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line bg-bg">
                  {matches.map((c) => {
                    const used = isTaken(c);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          disabled={used}
                          onClick={() => pick(c)}
                          className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2.5 text-left hover:bg-bg-alt disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="text-sm font-medium text-ink">
                            {c.name}
                            <span className="font-normal text-ink-soft"> · {c.collegeName}</span>
                          </span>
                          <span className="text-xs text-ink-faint">
                            {[c.mode, c.duration, c.fees].filter(Boolean).join(" · ")}
                            {used && " · already a programme"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {matches.length === 0 && (
                    <li className="px-3 py-4 text-center text-sm text-ink-soft">
                      {courses.length === 0 ? "No college has a course yet. Add courses to a college first." : `No course matches \u201c${query}\u201d.`}
                    </li>
                  )}
                </ul>
                <p className="mt-1 text-xs text-ink-faint">{courses.length} courses across all colleges. Showing up to 50.</p>
              </>
            )}
          </div>
        )}

        {!picking && (
        <>
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
            <DurationField id="prog-od" label="Duration" value={draft.onlineDuration} onChange={(v) => set("onlineDuration", v)} hint="A number, then days, months or years." />
            <FeesField id="prog-of" label="Fees" value={draft.onlineFees} onChange={(v) => set("onlineFees", v)} hint="An amount, in rupees unless you pick another currency." />
            <Text id="prog-on" label="Fees note" max={200} value={draft.onlineFeesNote} onChange={(v) => set("onlineFeesNote", v)} hint="e.g. (including taxes)." />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-xs font-semibold text-ink">On campus</legend>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <DurationField id="prog-cd" label="Duration" value={draft.onCampusDuration} onChange={(v) => set("onCampusDuration", v)} hint="A number, then days, months or years." />
            <FeesField id="prog-cf" label="Fees" value={draft.onCampusFees} onChange={(v) => set("onCampusFees", v)} hint="An amount, in rupees unless you pick another currency." />
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
        </>
        )}
      </div>
    </AdminModal>
  );
}
