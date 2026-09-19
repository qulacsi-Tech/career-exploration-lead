"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { isRichTextEmpty } from "@/lib/rich-text";
import { type Question, type Stimulus } from "@/lib/practice-data";
import type { Working } from "@/lib/practice-attempt";
import { QuestionContent } from "@/components/practice/question-content";

/**
 * One question, with its stimulus pane when it belongs to a set.
 *
 * ## Why the stimulus is a sibling, not a child
 *
 * A passage or caselet is shared by four to six questions. Rendering it inside
 * the question would remount it on every Next, which resets the reader's scroll
 * position — and losing your place in a passage is losing the reading time the
 * section is made of. It sits in its own pane, keyed by stimulus id, so moving
 * within a set leaves it untouched and only moving between sets replaces it.
 */

export function QuestionView({
  question,
  stimulus,
  index,
  working,
  onChange,
}: {
  question: Question;
  stimulus?: Stimulus;
  /** Zero-based position in the paper; displayed one-based. */
  index: number;
  working: Working;
  onChange: (next: Working) => void;
}) {
  const body = (
    <div className="min-w-0">
      <QuestionHeader index={index} question={question} />

      <div className="mt-4">
        <QuestionContent doc={question.stem} />
      </div>

      <div className="mt-6">
        {question.type === "tita" ? (
          <TitaInput
            value={working && "value" in working ? working.value : ""}
            onChange={(value) => onChange({ value })}
          />
        ) : (
          <OptionList question={question} working={working} onChange={onChange} />
        )}
      </div>
    </div>
  );

  // Width is the shell's business, not the question's — it goes full-bleed when
  // a stimulus needs two panes. Setting a max here as well would fight it.
  if (!stimulus) return body;

  return (
    /*
      Split from lg up, stacked below it.

      Each pane owns its own scrollbar and the row itself does not scroll —
      `min-h-0` on both is what allows them to shrink inside the shell instead
      of pushing it taller. Without that you get the row scrolling *and* each
      pane scrolling, which is two scrollbars for one reading task and the
      passage sliding away while you reach for an option.

      The passage is `key`ed on the stimulus id so React keeps the same element
      across questions in a set: moving from question 2 to 3 of one passage
      leaves the pane — and the reader's scroll position in it — untouched, and
      only a change of passage replaces it.
    */
    <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
      <StimulusPane key={stimulus.id} stimulus={stimulus} />
      <div className="min-h-0 overflow-y-auto pr-1 lg:pr-2">{body}</div>
    </div>
  );
}

/**
 * The passage or caselet, with a full-screen reading view.
 *
 * A CAT passage is 500-odd words and a candidate reads it two or three times
 * while working a set. Half a column is enough to answer from but not enough to
 * read comfortably, so Enlarge hands over the whole window — the questions are
 * not going anywhere, and reading is the part of the task that the pane width
 * was taxing.
 */
function StimulusPane({ stimulus }: { stimulus: Stimulus }) {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <>
      <aside className="flex min-h-0 flex-col rounded-xl border border-line bg-bg-alt">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {stimulus.label}
          </p>
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
          >
            <Maximize2 className="h-3 w-3" />
            Enlarge
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <QuestionContent doc={stimulus.body} />
        </div>
      </aside>

      {enlarged && <StimulusOverlay stimulus={stimulus} onClose={() => setEnlarged(false)} />}
    </>
  );
}

/**
 * The passage at full width.
 *
 * Capped to a reading measure rather than stretched across a wide monitor —
 * the point is comfortable reading, and a 1,600px line is harder to read than
 * the pane this was opened to escape.
 */
function StimulusOverlay({
  stimulus,
  onClose,
}: {
  stimulus: Stimulus;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={stimulus.label}
      className="fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <p className="font-display text-sm font-bold text-ink">{stimulus.label}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <QuestionContent doc={stimulus.body} className="text-[0.975rem] leading-[1.85]" />
        </div>
      </div>
    </div>
  );
}

function QuestionHeader({ index, question }: { index: number; question: Question }) {
  const marking =
    question.negativeMarks > 0
      ? `+${question.marks} / −${question.negativeMarks}`
      : `+${question.marks} · no negative marking`;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
      <h1 className="font-display text-lg font-bold text-ink">Question {index + 1}:</h1>

      <div className="flex items-center gap-3 text-xs text-ink-soft">
        {question.type === "mcq-multi" && (
          <span className="rounded-md border border-line bg-bg-alt px-2 py-0.5 font-medium">
            Select all that apply
          </span>
        )}
        {question.type === "tita" && (
          <span className="rounded-md border border-line bg-bg-alt px-2 py-0.5 font-medium">
            Type in the answer
          </span>
        )}
        <span>{marking}</span>
      </div>
    </div>
  );
}

/**
 * The options.
 *
 * Numbered (1)–(4) rather than lettered, matching the paper. A whole option is
 * the click target — a candidate aiming at a 16px radio under time pressure is
 * a candidate mis-clicking.
 */
function OptionList({
  question,
  working,
  onChange,
}: {
  question: Question;
  working: Working;
  onChange: (next: Working) => void;
}) {
  const options = question.options ?? [];
  const selected = working && "optionIds" in working ? working.optionIds : [];
  const multi = question.type === "mcq-multi";

  /*
    Image options lay out as a grid. Four diagrams stacked in a column is not
    what the real paper looks like and forces scrolling to compare them, which
    is the entire task in an abstract reasoning question.
  */
  const allImages = options.every((option) => isImageOnly(option.body));

  const toggle = (optionId: string) => {
    if (!multi) {
      onChange({ optionIds: [optionId] });
      return;
    }
    onChange({
      optionIds: selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId],
    });
  };

  return (
    <ul className={allImages ? "grid gap-3 sm:grid-cols-2" : "space-y-2.5"} role="list">
      {options.map((option, position) => {
        const isSelected = selected.includes(option.id);

        return (
          <li key={option.id}>
            <label
              className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
                isSelected
                  ? "border-brand bg-brand-soft/50 ring-1 ring-brand"
                  : "border-line bg-surface hover:border-brand/40 hover:bg-bg-alt"
              } ${allImages ? "flex-col items-center text-center" : "items-start"}`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={`q-${question.id}`}
                  checked={isSelected}
                  onChange={() => toggle(option.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="font-display text-sm font-semibold text-ink-soft">
                  ({position + 1})
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <QuestionContent doc={option.body} zoomable={false} className="text-sm" />
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** True when a document holds a figure and nothing else worth reading. */
function isImageOnly(doc: { content?: unknown[] } | null | undefined): boolean {
  if (!doc?.content || doc.content.length === 0) return false;
  return doc.content.every((node) => {
    const n = node as { type?: string };
    if (n.type === "image") return true;
    // An empty paragraph beside a figure is an artefact of the editor, not content.
    return isRichTextEmpty({ type: "doc", content: [node] } as never);
  });
}

/**
 * Type-in-the-answer.
 *
 * `inputMode="decimal"` so a phone offers the numeric keypad, and the input is
 * filtered to digits, one decimal point and a leading minus rather than being
 * `type="number"` — a number input silently discards what it cannot parse as
 * the candidate types, which loses keystrokes mid-entry.
 */
function TitaInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="max-w-xs">
      <label htmlFor="tita" className="block text-xs font-semibold text-ink">
        Your answer
      </label>
      <input
        id="tita"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          const cleaned = event.target.value.replace(/[^\d.-]/g, "");
          if (/^-?\d*\.?\d*$/.test(cleaned)) onChange(cleaned);
        }}
        placeholder="Enter a number"
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 font-display text-lg text-ink placeholder:text-sm placeholder:font-sans placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />
      <p className="mt-1.5 text-xs text-ink-faint">
        No negative marking on this question type.
      </p>
    </div>
  );
}
