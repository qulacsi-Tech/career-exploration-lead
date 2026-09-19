"use client";

import type { MockTest } from "@/lib/practice-data";
import {
  type Attempt,
  type QuestionStatus,
  type StatusCounts,
  countStatuses,
  sectionIdAt,
} from "@/lib/practice-attempt";

/**
 * The question palette: the legend with live counts, then the numbered grid.
 *
 * Modelled on the exam software candidates actually sit — five states, their
 * shapes and colours, the counts in the legend, eight tiles to a row and
 * zero-padded two-digit numbers. None of that is arbitrary; it is a control
 * people arrive already knowing how to read, and the value of matching it is
 * that it needs no explaining.
 *
 * The shapes are defined in globals.css. They carry state redundantly with
 * colour so the palette survives a colour vision deficiency — see the note
 * there.
 */

const STATE_LABELS: Record<QuestionStatus, string> = {
  "not-visited": "Not Visited",
  "not-answered": "Not Answered",
  answered: "Answered",
  marked: "Marked for Review",
  "answered-marked": "Answered & Marked for Review",
};

/** Legend order matches the exam software's, left to right, top to bottom. */
const LEGEND_ORDER: QuestionStatus[] = [
  "not-visited",
  "not-answered",
  "answered",
  "marked",
  "answered-marked",
];

export function statusClass(status: QuestionStatus): string {
  return `palette-tile palette-tile--${status}`;
}

function LegendRow({ counts }: { counts: StatusCounts }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
      {LEGEND_ORDER.map((status) => (
        <li
          key={status}
          className={
            // The fifth state's label is long enough to need the full width.
            status === "answered-marked" ? "col-span-2 flex items-center gap-2" : "flex items-center gap-2"
          }
        >
          <span
            aria-hidden
            className={`${statusClass(status)} flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-bold`}
          >
            {counts[status]}
          </span>
          <span className="text-[11px] leading-tight text-ink-soft">
            {STATE_LABELS[status]}
            {status === "answered-marked" && (
              <span className="text-ink-faint"> (will be considered for evaluation)</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function QuestionPalette({
  test,
  attempt,
  onJump,
  className = "",
}: {
  test: MockTest;
  attempt: Attempt;
  onJump: (index: number) => void;
  className?: string;
}) {
  const counts = countStatuses(test, attempt);

  /*
    Numbering runs off a running offset through the sections, not off a lookup
    of `Question.sectionId`.

    The two are not the same thing and must not be assumed to be: a test section
    owns an ordered list of question ids, while a question carries the id of the
    section it was *written* for. A mixed sample set pulls questions from three
    different source sections into one test section — at which point searching
    the flattened list for a question whose sectionId matches finds nothing,
    and the palette numbers from zero.
  */
  const groups = test.sections.map((section, position) => ({
    section,
    start: test.sections
      .slice(0, position)
      .reduce((total, earlier) => total + earlier.questionIds.length, 0),
  }));

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <LegendRow counts={counts} />

      <div className="border-t border-line pt-4">
        {groups.map(({ section, start }) => {
          const locked = attempt.lockedSectionIds.includes(section.id);

          return (
            <div key={section.id} className="mb-5 last:mb-0">
              {/* Dropped on a single-section paper — there is nothing to
                  distinguish, and the label is only noise. */}
              {test.sections.length > 1 && (
                <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {section.label}
                  {locked && <LockGlyph />}
                </p>
              )}

              <ul className="grid grid-cols-8 gap-1.5" role="list">
                {section.questionIds.map((questionId, offsetInSection) => {
                  const index = start + offsetInSection;
                  const status = attempt.responses[questionId]?.status ?? "not-visited";
                  const isCurrent = index === attempt.currentIndex;

                  return (
                    <li key={questionId}>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onJump(index)}
                        aria-current={isCurrent ? "true" : undefined}
                        aria-label={`Question ${index + 1}, ${STATE_LABELS[status]}${
                          locked ? ", section locked" : ""
                        }`}
                        className={`${statusClass(status)} ${
                          isCurrent ? "palette-tile--current" : ""
                        } flex h-9 w-full items-center justify-center text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          locked ? "" : "hover:opacity-80"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3 w-3">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export { sectionIdAt };
