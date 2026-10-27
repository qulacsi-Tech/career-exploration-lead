"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Search } from "lucide-react";
import { saveCourseInfo } from "@/lib/admin-actions";
import type { AdminCourse, CourseInfo } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { ChipInput, DurationField, NumberInput, TextArea, TextInput } from "@/components/admin/college-editor/shared";

const MODES = ["Full Time", "Part Time", "Weekend", "Online", "Distance"];

const infoOf = (c: AdminCourse): CourseInfo => ({
  duration: c.duration ?? "",
  averageFees: c.averageFees ?? "",
  examsAccepted: c.examsAccepted ?? [],
  modes: c.modes ?? [],
  eligibility: c.eligibility ?? "",
  priority: c.priority ?? null,
});
const filled = (i: CourseInfo) => [i.duration, i.averageFees, i.eligibility].filter((v) => v.trim()).length + (i.examsAccepted.length > 0 ? 1 : 0) + (i.modes.length > 0 ? 1 : 0) + (i.priority !== null ? 1 : 0);
const same = (a: CourseInfo, b: CourseInfo) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A button that opens the course info dialog: pick any course and type what its card on the Courses page should say
 * (duration, average fees, study modes, exams, eligibility). Nothing is worked out for a course: a field left empty
 * is not shown, so a card shows exactly what was added here.
 */
export function CourseInfoButton({ courses, exams }: { courses: AdminCourse[]; exams: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand">
        <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
        Manage course info
      </button>
      {open && <CourseInfoDialog courses={courses} exams={exams} onClose={() => setOpen(false)} />}
    </>
  );
}

function CourseInfoDialog({ courses, exams, onClose }: { courses: AdminCourse[]; exams: string[]; onClose: () => void }) {
  const router = useRouter();
  // What is saved, kept here so a course shows its new figures at once and the badges follow.
  const [saved, setSaved] = useState<Record<string, CourseInfo>>(() => Object.fromEntries(courses.map((c) => [c.slug, infoOf(c)])));
  const [slug, setSlug] = useState(courses[0]?.slug ?? "");
  const [draft, setDraft] = useState<CourseInfo | null>(courses[0] ? infoOf(courses[0]) : null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const course = courses.find((c) => c.slug === slug);
  const dirty = draft !== null && !same(draft, saved[slug]);
  // Each priority number belongs to one course.
  const holder = draft?.priority != null ? courses.find((c) => c.slug !== slug && saved[c.slug].priority === draft.priority) : undefined;
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => courses.filter((c) => !q || `${c.name} ${c.streams.join(" ")}`.toLowerCase().includes(q)), [courses, q]);

  const pick = (next: string) => {
    if (next === slug) return;
    if (dirty && !window.confirm("Leave this course? What you changed has not been saved.")) return;
    setSlug(next);
    setDraft(saved[next]);
    setMessage(null);
  };
  const set = (patch: Partial<CourseInfo>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setMessage(null);
  };

  const save = () => {
    if (!draft || !course) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveCourseInfo(slug, draft);
      if ("error" in result) return setMessage({ kind: "error", text: result.error });
      setSaved((prev) => ({ ...prev, [slug]: draft }));
      setMessage({ kind: "ok", text: `${course.name} saved. Its card on the Courses page now shows exactly this.` });
      router.refresh();
    });
  };

  return (
    <AdminModal
      open
      onClose={() => (!dirty || window.confirm("Close without saving the changes to this course?")) && onClose()}
      size="eighty"
      title="Manage course info"
      description="Pick a course, set its priority, and add what its card should say. Nothing is filled in for you: a field you leave empty is not shown."
      footer={<button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand">Close</button>}
    >
      {courses.length === 0 ? (
        <p className="text-sm text-ink-soft">There are no courses in the catalogue yet. Add them in Content → Catalogue.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses" aria-label="Search courses" className="w-full rounded-lg border border-line bg-bg py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none" />
            </div>
            <ul className="max-h-[28rem] divide-y divide-line-soft overflow-y-auto rounded-xl border border-line">
              {shown.map((c) => {
                const n = filled(saved[c.slug]);
                const on = c.slug === slug;
                return (
                  <li key={c.slug}>
                    <button type="button" onClick={() => pick(c.slug)} aria-current={on ? "true" : undefined} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition ${on ? "bg-brand-soft" : "hover:bg-bg"}`}>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${on ? "font-semibold text-brand-ink" : "text-ink"}`}>{c.name}</span>
                        <span className="block truncate text-xs text-ink-faint">{c.streams.join(", ") || "—"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${n > 0 ? "bg-green-100 text-green-800" : "bg-bg-alt text-ink-faint"}`}>{n > 0 ? `${n} added` : "Nothing"}</span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-soft">No course matches.</li>}
            </ul>
          </div>

          {course && draft && (
            // Enter in a box must not submit a form around this dialog.
            <div className="min-w-0 space-y-5" onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && e.preventDefault()}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{course.name}</h3>
                  <p className="text-xs text-ink-soft">{course.fullName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set({ duration: "", averageFees: "", examsAccepted: [], modes: [], eligibility: "", priority: null })} disabled={filled(draft) === 0} className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-red-700 hover:text-red-700 disabled:opacity-40">Clear all</button>
                  <button type="button" onClick={save} disabled={pending || !dirty || Boolean(holder)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
                </div>
              </div>

              {message && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}

              <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4">
                <div className="max-w-xs">
                  <NumberInput id={`ci-${slug}-priority`} label="Priority" min={1} max={100000} value={draft.priority} onChange={(v) => set({ priority: v })} placeholder="None" hint="1 is shown first in the Courses list and menu, then 2, and so on. Courses with no number follow." />
                </div>
                {holder && <p role="alert" className="mt-2 text-sm text-red-700">Priority {draft.priority} is already given to {holder.name}. Each priority belongs to one course.</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DurationField id={`ci-${slug}-duration`} label="Duration" value={draft.duration} onChange={(v) => set({ duration: v })} />
                <TextInput id={`ci-${slug}-fees`} label="Average fees" max={100} value={draft.averageFees} onChange={(v) => set({ averageFees: v })} placeholder="e.g. ₹4L - 20L" hint="An amount or a range." />
              </div>
              <ChipInput id={`ci-${slug}-modes`} label="Study modes" value={draft.modes} onChange={(v) => set({ modes: v })} suggestions={MODES} max={5} strict hint="Shown beside the category on the card." />
              <ChipInput id={`ci-${slug}-exams`} label="Exams accepted" value={draft.examsAccepted} onChange={(v) => set({ examsAccepted: v })} suggestions={exams} max={30} strict hint="Entrance exams from the exam directory." />
              <TextArea id={`ci-${slug}-elig`} label="Eligibility" max={4000} rows={3} value={draft.eligibility} onChange={(v) => set({ eligibility: v })} hint="e.g. Graduation with 50% marks." />
            </div>
          )}
        </div>
      )}
    </AdminModal>
  );
}
