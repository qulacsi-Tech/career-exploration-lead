"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { saveExamPriorities } from "@/lib/admin-actions";
import type { Exam } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { PriorityAssigner, type PriorityRow, type PriorityWords } from "@/components/admin/priority-assigner";

const EXAM_WORDS: PriorityWords = {
  one: "exam",
  many: "Exams",
  detail: "Conducted by",
  sharedNote: "Several exams can hold the same priority: they take that place together, the sooner exam first.",
};

const ghostButton = "rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand";

/**
 * A button for the Exams page that opens the priority dialog: which exams the public Exams page shows first, and in
 * what order. Same picker as the colleges' Advanced priority. Archived exams are not on the site, so not offered.
 */
export function ExamPriorityButton({ exams }: { exams: Exam[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand">
        <ListOrdered className="h-4 w-4" aria-hidden="true" />
        Listing priority
      </button>
      {open && <ExamPriorityDialog exams={exams} onClose={() => setOpen(false)} />}
    </>
  );
}

function ExamPriorityDialog({ exams, onClose }: { exams: Exam[]; onClose: () => void }) {
  const router = useRouter();
  // Built once when the dialog opens: the exams with a priority first, in order, then the rest by name.
  const initial = useMemo<PriorityRow[]>(() => {
    const rows = exams
      .filter((e) => !e.archived)
      .map((e) => ({ slug: e.slug, name: e.name, city: e.conductingBody, rank: null, value: e.listingPriority ? String(e.listingPriority) : "" }));
    const numbered = rows.filter((r) => r.value).sort((a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name));
    return [...numbered, ...rows.filter((r) => !r.value).sort((a, b) => a.name.localeCompare(b.name))];
  }, [exams]);
  const [rows, setRows] = useState<PriorityRow[] | null>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, startSave] = useTransition();
  // Any edit after a save clears the "Saved" note.
  const editRows: typeof setRows = (next) => {
    setSaved(false);
    setRows(next);
  };

  const save = () => {
    if (!rows) return;
    setError("");
    startSave(async () => {
      // Every exam is sent, so one taken off in the dialog loses its priority too.
      const result = await saveExamPriorities(Object.fromEntries(rows.map((r) => [r.slug, r.value ? Number(r.value) : null])));
      if ("error" in result) return setError(result.error);
      // The dialog stays open after saving; only the user closes it.
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      size="eighty"
      title="Exam listing priority"
      description="A priority is a place on the public Exams page: 1 is the first place, 2 the second. Exams with a number come first, lowest number first. Exams with no number follow in the usual order: the soonest exam first, then those with no date yet, then those whose registration has closed."
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>{saved ? "Close" : "Cancel"}</button>
          <button type="button" onClick={save} disabled={!rows || saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {saving ? "Saving…" : "Save priorities"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-bg-alt/70 px-4 py-2.5 text-xs text-ink-soft">
          The order applies to the Exams page, with or without filters: a filtered list keeps the same order among the exams it shows. Visitors who pick another sort (deadline, exam date, A–Z) see that sort instead.
        </p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        {saved && !error && <p role="status" className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">Priorities saved. The Exams page shows the new order now. You can keep editing or close this window.</p>}
        {rows && rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">There are no exams on the site yet.</p>
        ) : rows ? (
          <PriorityAssigner rows={rows} setRows={editRows} showRank={false} truncated={false} words={EXAM_WORDS} />
        ) : null}
      </div>
    </AdminModal>
  );
}
