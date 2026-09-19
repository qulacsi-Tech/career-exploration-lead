"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type MockTest,
  stimulusById,
} from "@/lib/practice-data";
import {
  type Attempt,
  type Working,
  addSeconds,
  clearResponse,
  createAttempt,
  firstIndexOfSection,
  flatQuestions,
  loadAttempt,
  markForReview,
  persistAttempt,
  saveResponse,
  sectionIdAt,
  visit,
  countStatuses,
} from "@/lib/practice-attempt";
import { PlayerHeader } from "@/components/practice/player-header";
import { QuestionPalette } from "@/components/practice/question-palette";
import { QuestionView } from "@/components/practice/question-view";

/**
 * The test player.
 *
 * Holds the attempt, runs the clock, and owns the four actions a candidate has.
 * Everything visual is delegated; what lives here is the state that has to stay
 * consistent between them.
 *
 * ## Working selection vs saved answer
 *
 * What is currently ticked (`working`) is not part of the attempt until a Save
 * commits it. That distinction is faithful to the real paper and is the reason
 * Mark for Review & Next discards a tick — see the note in practice-attempt.
 *
 * ## The clock
 *
 * One interval, ticking the attempt down and the current question's timer up.
 * Driven off a stored timestamp rather than counting intervals, because a
 * backgrounded tab throttles `setInterval` to once a minute and a candidate who
 * switches away would otherwise come back with time they had not earned.
 */

export function TestPlayer({
  test,
  candidateName,
}: {
  test: MockTest;
  candidateName: string;
}) {
  const router = useRouter();
  const questions = useMemo(() => flatQuestions(test), [test]);

  /*
    Resume or start, in a lazy initialiser rather than an effect.

    This runs on the client only — the module is loaded with `ssr: false`,
    because a paper whose opening state comes out of sessionStorage cannot be
    server-rendered without either a hydration mismatch or a flash of question
    one over a sitting already in progress.
  */
  const [attempt, setAttempt] = useState<Attempt>(() => {
    const existing = loadAttempt(test.slug);
    // A submitted attempt is finished; arriving again means a fresh sitting.
    return existing && !existing.submittedAt ? existing : createAttempt(test);
  });

  /*
    Resuming mid-paper must show the answer that was saved on the question being
    resumed to — looked up by id, not by position in the responses object.
    Indexing into the object's values happens to work while the keys are in
    paper order and breaks silently the moment anything re-serialises them in a
    different one, which is the kind of bug that surfaces as "it showed me
    someone else's answer".
  */
  const [working, setWorking] = useState<Working>(() => {
    const question = questions[attempt.currentIndex];
    const saved = question ? attempt.responses[question.id]?.saved : undefined;
    return saved ? ({ ...saved } as Working) : null;
  });
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const current = questions[attempt.currentIndex];

  /*
    Arriving at a question: load its saved answer into the working selection and
    mark it visited.

    Done during render rather than in an effect — React's documented way to
    adjust state when something it derives from changes. An effect would render
    the new question with the previous question's ticks still showing, then
    correct itself a frame later, which is exactly the flicker a candidate
    reads as a mis-click.
  */
  const [lastQuestionId, setLastQuestionId] = useState(current?.id ?? "");
  if (current && current.id !== lastQuestionId) {
    setLastQuestionId(current.id);
    const saved = attempt.responses[current.id]?.saved;
    setWorking(saved ? ({ ...saved } as Working) : null);
    setAttempt((prev) => visit(prev, current.id));
  }

  /* -------------------------------------------------- Persistence */

  useEffect(() => {
    persistAttempt(attempt);
  }, [attempt]);

  /* -------------------------------------------------- The clock */

  /*
    One interval, ticking the paper down and the current question's timer up.

    Driven off a stored timestamp rather than counting ticks: a backgrounded tab
    has its intervals throttled to roughly once a minute, and a candidate who
    switches away would otherwise return holding time they had not earned.

    Expiry is handled inside the tick rather than by a second effect watching
    the clock. A locked paper closes the section and opens the next one; an
    unlocked paper ends the sitting. Either way the decision belongs at the
    moment the clock crosses zero, not a render later.
  */
  const tickRef = useRef<number | null>(null);
  const untimed = !Number.isFinite(attempt.secondsRemaining);

  useEffect(() => {
    if (attempt.submittedAt || untimed) return;

    tickRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = tickRef.current ?? now;
      const elapsed = Math.round((now - last) / 1000);
      if (elapsed <= 0) return;
      tickRef.current = now;

      setAttempt((prev) => {
        if (prev.submittedAt) return prev;

        const question = questions[prev.currentIndex];
        const ticked = question ? addSeconds(prev, question.id, elapsed) : prev;
        const remaining = ticked.secondsRemaining - elapsed;
        if (remaining > 0) return { ...ticked, secondsRemaining: remaining };

        const order = test.sections.findIndex((s) => s.id === ticked.currentSectionId);
        const next = test.sections[order + 1];

        if (test.sectionLock && next) {
          return {
            ...ticked,
            lockedSectionIds: [...ticked.lockedSectionIds, ticked.currentSectionId],
            currentSectionId: next.id,
            currentIndex: firstIndexOfSection(test, next.id),
            secondsRemaining: (next.durationMinutes ?? 0) * 60,
          };
        }

        return { ...ticked, secondsRemaining: 0, submittedAt: Date.now() };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [attempt.submittedAt, untimed, questions, test]);

  /* A submitted attempt — by button or by the clock — goes to its result. */
  useEffect(() => {
    if (attempt.submittedAt) router.push(`/practice/result/${test.slug}`);
  }, [attempt.submittedAt, router, test.slug]);

  /* -------------------------------------------------- Navigation */

  const goTo = useCallback(
    (index: number) => {
      setAttempt((prev) => {
        const bounded = Math.max(0, Math.min(questions.length - 1, index));
        return { ...prev, currentIndex: bounded, currentSectionId: sectionIdAt(test, bounded) };
      });
    },
    [questions.length, test],
  );

  const goNext = useCallback(() => {
    setAttempt((prev) => {
      const next = prev.currentIndex + 1;
      if (next >= questions.length) return prev;
      const nextSection = sectionIdAt(test, next);
      /*
        In a locked paper Next stops at the section boundary. Walking into the
        next section early would either break the lock or silently burn that
        section's clock — both worse than a button that does nothing.
      */
      if (test.sectionLock && nextSection !== prev.currentSectionId) return prev;
      return { ...prev, currentIndex: next, currentSectionId: nextSection };
    });
  }, [questions.length, test]);

  /* -------------------------------------------------- Actions */

  const save = (markForReviewToo: boolean) => {
    if (!current) return;
    setAttempt((prev) => saveResponse(prev, current.id, working, markForReviewToo));
    goNext();
  };

  const markAndNext = () => {
    if (!current) return;
    setAttempt((prev) => markForReview(prev, current.id));
    goNext();
  };

  const clear = () => {
    if (!current) return;
    setWorking(null);
    setAttempt((prev) => clearResponse(prev, current.id));
  };

  const selectSection = (sectionId: string) => {
    if (test.sectionLock) return;
    goTo(firstIndexOfSection(test, sectionId));
  };

  const submit = () => {
    setAttempt((prev) => ({ ...prev, submittedAt: Date.now() }));
  };

  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-soft">
        Preparing your paper…
      </div>
    );
  }

  const activeSection = test.sections.find((s) => s.id === attempt.currentSectionId);
  const stimulus = stimulusById(current.stimulusId);
  const atSectionEnd =
    test.sectionLock && sectionIdAt(test, attempt.currentIndex + 1) !== attempt.currentSectionId;

  return (
    /*
      An app shell, not a document.

      The whole frame is exactly one viewport tall and does not scroll; only the
      question area inside it does. That is what keeps the action buttons and
      the palette fixed in place while questions of wildly different lengths go
      past — a three-line arithmetic question and a five-paragraph passage put
      Save & Next in the same spot, so a candidate can hit it without looking.
      Letting the page grow instead moves every control on every question, which
      is the flicker and the mis-clicks that come with it.

      100dvh rather than 100vh: on mobile Safari and Chrome the toolbar collapses
      on scroll, and vh is measured against the *expanded* toolbar, so a vh-tall
      shell is permanently a little taller than the screen.
    */
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      <PlayerHeader
        test={test}
        candidateName={candidateName}
        secondsRemaining={attempt.secondsRemaining}
        sectionLabel={test.sectionLock ? activeSection?.label : undefined}
        currentSectionId={attempt.currentSectionId}
        lockedSectionIds={attempt.lockedSectionIds}
        onSelectSection={selectSection}
      />

      {/* min-h-0 so the children may actually shrink — without it a flex child
          takes its content height as a floor and the scroll never engages. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-w-0 flex-1 flex-col">
          {/*
            Two different jobs, two different containers.

            With a stimulus the region goes full-bleed and does NOT scroll: it
            hands its height to the split panes, which scroll independently.
            That removes the outer scrollbar entirely — one passage, one
            scrollbar — and gives the passage the full half-width instead of
            leaving it stranded inside a centred column with dead gutters on
            both sides.

            Without one, a single question column is easier to read at a measure
            than stretched across a wide monitor, so it is capped and centred
            and the region scrolls normally.
          */}
          {stimulus ? (
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
              <QuestionView
                question={current}
                stimulus={stimulus}
                index={attempt.currentIndex}
                working={working}
                onChange={setWorking}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto w-full max-w-4xl">
                <QuestionView
                  question={current}
                  stimulus={undefined}
                  index={attempt.currentIndex}
                  working={working}
                  onChange={setWorking}
                />
              </div>
            </div>
          )}

          <ActionBar
            onSave={() => save(false)}
            onSaveAndMark={() => save(true)}
            onClear={clear}
            onMarkAndNext={markAndNext}
            onBack={() => goTo(attempt.currentIndex - 1)}
            onNext={goNext}
            onSubmit={() => setConfirming(true)}
            canGoBack={
              attempt.currentIndex > 0 &&
              (!test.sectionLock ||
                sectionIdAt(test, attempt.currentIndex - 1) === attempt.currentSectionId)
            }
            canGoNext={attempt.currentIndex < questions.length - 1 && !atSectionEnd}
          />
        </main>

        <PaletteRail
          open={paletteOpen}
          onToggle={() => setPaletteOpen((value) => !value)}
          test={test}
          attempt={attempt}
          onJump={goTo}
        />
      </div>

      {confirming && (
        <SubmitDialog
          test={test}
          attempt={attempt}
          onCancel={() => setConfirming(false)}
          onConfirm={submit}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Action bar
 * ------------------------------------------------------------------ */

/**
 * Four actions, and the wording is not ours to improve.
 *
 * "Save & Next", "Save & Mark for Review", "Clear Response" and "Mark for
 * Review & Next" are what a candidate has already used. Renaming them to
 * something clearer would make a familiar control need reading.
 */
function ActionBar({
  onSave,
  onSaveAndMark,
  onClear,
  onMarkAndNext,
  onBack,
  onNext,
  onSubmit,
  canGoBack,
  canGoNext,
}: {
  onSave: () => void;
  onSaveAndMark: () => void;
  onClear: () => void;
  onMarkAndNext: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
}) {
  return (
    /*
      One row, pinned to the bottom of the shell — shrink-0 so it keeps its
      height whatever the question above is doing, and never scrolls out of
      reach on a long passage.

      The four response actions sit left, navigation and Submit right, with the
      gap between them doing the separating rather than a divider. Submit is
      deliberately the furthest thing from Save & Next: they are the two most
      consequential buttons here and the one that ends the paper should not be
      adjacent to the one used on every question.
    */
    <div className="shrink-0 border-t border-line bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--practice-answered)" }}
        >
          Save &amp; Next
        </button>

        <button
          type="button"
          onClick={onSaveAndMark}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--practice-marked)" }}
        >
          Save &amp; Mark for Review
        </button>

        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Clear Response
        </button>

        <button
          type="button"
          onClick={onMarkAndNext}
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Mark for Review &amp; Next
        </button>

        {/* ml-auto pushes navigation and Submit to the far edge on a wide row,
            and folds them onto the next line rather than squashing when the
            four actions above already fill it. */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            aria-label="Previous question"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Next question"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="ml-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Palette rail
 * ------------------------------------------------------------------ */

function PaletteRail({
  open,
  onToggle,
  test,
  attempt,
  onJump,
}: {
  open: boolean;
  onToggle: () => void;
  test: MockTest;
  attempt: Attempt;
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex shrink-0 border-t border-line lg:border-l lg:border-t-0">
      {/*
        The collapse handle. Folding the palette away buys reading width, which
        matters most on a long passage and on a tablet — exactly where the
        palette matters least. Hidden below lg, where the palette stacks under
        the question instead of sitting beside it and there is no width to buy.
      */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Hide question palette" : "Show question palette"}
        className="hidden shrink-0 items-center border-r border-line bg-bg-alt px-0.5 text-ink-soft transition hover:bg-brand-soft hover:text-brand lg:flex"
      >
        {open ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>

      {open && (
        <div className="w-full overflow-y-auto bg-surface px-4 py-5 lg:w-80 lg:shrink-0">
          <QuestionPalette test={test} attempt={attempt} onJump={onJump} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Submit confirmation
 * ------------------------------------------------------------------ */

/**
 * The counts before committing.
 *
 * Shown because submitting by accident cannot be undone, and because this is
 * where a candidate discovers they have four questions marked for review with
 * no saved answer — the one mistake the faithful Mark-for-Review behaviour
 * invites.
 */
function SubmitDialog({
  test,
  attempt,
  onCancel,
  onConfirm,
}: {
  test: MockTest;
  attempt: Attempt;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const counts = countStatuses(test, attempt);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const rows: { label: string; value: number; warn?: boolean }[] = [
    { label: "Answered", value: counts.answered + counts["answered-marked"] },
    { label: "Not answered", value: counts["not-answered"], warn: counts["not-answered"] > 0 },
    { label: "Not visited", value: counts["not-visited"], warn: counts["not-visited"] > 0 },
    { label: "Marked, with no answer saved", value: counts.marked, warn: counts.marked > 0 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h2 id="submit-heading" className="font-display text-lg font-bold text-ink">
          Submit this test?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          You cannot return to the paper once it is submitted.
        </p>

        <dl className="mt-5 space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
            >
              <dt className="text-ink-soft">{row.label}</dt>
              <dd className={`font-display font-bold ${row.warn ? "text-brand" : "text-ink"}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {counts.marked > 0 && (
          <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand-ink">
            Questions marked for review without a saved answer score nothing. Go back and use
            <strong> Save &amp; Mark for Review</strong> if you meant to record an answer on them.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Back to paper
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
