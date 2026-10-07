"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { useState, useTransition } from "react";
import { saveTopExams } from "@/lib/admin-actions";
import type { AdminExam, AdminTopExams } from "@/lib/api";
import type { ExamCardCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import { AdminSection } from "@/components/admin/admin-section";
import { ExamDetailModal } from "@/components/admin/exam-detail-modal";
import { ExamModal, MAX_TOP_EXAMS } from "@/components/admin/exam-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The homepage's Top Exams row, one line per exam.

  Tick an exam to put it in the row (it holds six) and use Up and Down to order the
  ticked ones. Every click saves at once. Everything about an exam card, and adding a new
  one, is in the form that Add exam and Edit open. The eye button opens the content of the
  exam's own page (about, dates, pattern, syllabus, FAQs). Exams are listed with the ones in
  the row first, in their order, then the rest by name.
*/

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function TopExamsEditor({ topExams, wording, streams }: { topExams: AdminTopExams; wording: ExamCardCopy; streams: string[] }) {
  const router = useRouter();
  const [list, setList] = useState<AdminExam[]>(topExams.exams);
  const [seen, setSeen] = useState(topExams);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  // undefined: closed. null: adding. An exam: editing it.
  const [modal, setModal] = useState<AdminExam | null | undefined>(undefined);
  // The exam whose own page content is open (the eye button).
  const [detail, setDetail] = useState<AdminExam | null>(null);

  // The page re-rendered with fresh data (after a save or the form closing).
  if (topExams !== seen) {
    setSeen(topExams);
    setList(topExams.exams);
  }

  const shownCount = list.filter((e) => e.show).length;
  const rowFull = shownCount >= MAX_TOP_EXAMS;

  /** Shows the change at once, saves the row, and puts the old list back if the save fails. */
  const persist = (next: AdminExam[], success: string) => {
    const previous = list;
    setList(next);
    clearFlash();
    startTransition(async () => {
      const result = await saveTopExams(next.filter((e) => e.show).map((e) => e.slug));
      if ("error" in result) {
        setList(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const tick = (exam: AdminExam, on: boolean) => {
    const others = list.filter((e) => e.slug !== exam.slug);
    const ticked = others.filter((e) => e.show);
    const rest = others.filter((e) => !e.show);
    const next = on ? [...ticked, { ...exam, show: true }, ...rest] : [...ticked, { ...exam, show: false }, ...rest];
    persist(next, on ? `${exam.name} is now in the homepage row.` : `${exam.name} was taken out of the homepage row.`);
  };

  const shift = (exam: AdminExam, direction: -1 | 1) => {
    const ticked = list.filter((e) => e.show);
    const rest = list.filter((e) => !e.show);
    const index = ticked.findIndex((e) => e.slug === exam.slug);
    persist([...move(ticked, index, direction), ...rest], `Moved ${exam.name} ${direction < 0 ? "up" : "down"}. Order saved.`);
  };

  return (
    <AdminSection
      title="Top exams"
      description={`The exams in the homepage row, left to right. Tick up to ${MAX_TOP_EXAMS}, and use Up and Down to order them.`}
      actions={
        <button type="button" onClick={() => setModal(null)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Add exam
        </button>
      }
    >
      <div className="space-y-4">
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            There are no exams yet. Click Add exam to create the first one.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">
              {shownCount} of {MAX_TOP_EXAMS} places used in the homepage row
            </p>

            {shownCount === 0 && (
              <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No exams are ticked. The Top Exams row will have no cards.
              </p>
            )}
            {rowFull && (
              <p role="status" className="rounded-lg border border-line bg-bg-alt px-4 py-3 text-sm text-ink-soft">
                The row is full. Untick an exam to make room for another.
              </p>
            )}

            <StatusMessage flash={flash} />

            <ul className="space-y-2">
              {list.map((exam) => {
                const tickedIndex = list.filter((e) => e.show).findIndex((e) => e.slug === exam.slug);
                return (
                  <li key={exam.slug} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 ${exam.show ? "" : "opacity-75"}`}>
                    <label className={`flex min-w-0 flex-1 items-center gap-3 ${!exam.show && rowFull ? "cursor-not-allowed" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={exam.show}
                        disabled={pending || (!exam.show && rowFull)}
                        onChange={(e) => tick(exam, e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
                        {exam.image && (
                          // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(exam.image)} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {exam.show ? `${tickedIndex + 1}. ` : ""}
                          {exam.name}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {exam.conductingBody} · {exam.level}
                          {exam.examDate ? ` · ${exam.examDate}` : ""}
                        </span>
                      </span>
                    </label>

                    {exam.show && !exam.image && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">No photo</span>
                    )}

                    <div className="flex items-center gap-2">
                      {exam.show && (
                        <>
                          <button type="button" aria-label={`Move ${exam.name} up`} disabled={tickedIndex === 0 || pending} onClick={() => shift(exam, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Up
                          </button>
                          <button type="button" aria-label={`Move ${exam.name} down`} disabled={tickedIndex === shownCount - 1 || pending} onClick={() => shift(exam, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Down
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit the page content of ${exam.name}`}
                        title="Page content: about, dates, pattern, syllabus, FAQs"
                        onClick={() => setDetail(exam)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-brand hover:text-brand"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setModal(exam)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                        Edit
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {list.length === 0 && <StatusMessage flash={flash} />}
      </div>

      {/* Mounted only while open, so every opening starts with a clean form. */}
      {modal !== undefined && (
        <ExamModal
          key={modal ? modal.slug : "new"}
          exam={modal}
          topSlugs={list.filter((e) => e.show).map((e) => e.slug)}
          wording={wording}
          streams={streams}
          onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }}
        />
      )}

      {detail && (
        <ExamDetailModal
          key={detail.slug}
          exam={detail}
          onClose={(message) => {
            setDetail(null);
            if (message) showFlash("ok", message);
          }}
        />
      )}
    </AdminSection>
  );
}
