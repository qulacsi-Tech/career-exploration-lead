/**
 * Attempt state: what a candidate has done to a paper, and what it scores.
 *
 * Kept apart from `practice-data` on purpose. That module is content — records
 * an editor authors. This is the runtime state of one sitting, and it is the
 * one genuinely write-heavy entity the platform will have. Separating them now
 * means the API for each can be designed without dragging the other along.
 *
 * ## The five states are NTA's, not ours
 *
 * Every Indian entrance exam uses the same palette vocabulary, and candidates
 * navigate it by muscle memory. Inventing tidier states would be a downgrade
 * dressed up as an improvement, so the names, the transitions and the
 * button wording below all match what a candidate has already sat.
 */

import {
  type MockTest,
  type Question,
  questionsForTest,
} from "@/lib/practice-data";

/* ------------------------------------------------------------------ *
   State
 * ------------------------------------------------------------------ */

export type QuestionStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked"
  | "answered-marked";

export type Response = {
  status: QuestionStatus;
  /** Committed answer — what a Save wrote. Undefined until one happens. */
  saved?: { optionIds: string[] } | { value: string };
  /** Accumulated while this question was on screen. */
  secondsSpent: number;
};

export type Attempt = {
  testSlug: string;
  startedAt: number;
  /** Index into the flattened question list. */
  currentIndex: number;
  currentSectionId: string;
  /** Sections whose time has run out, in a locked paper. Never re-enterable. */
  lockedSectionIds: string[];
  responses: Record<string, Response>;
  /** Seconds left overall; for a locked paper, seconds left in this section. */
  secondsRemaining: number;
  submittedAt?: number;
};

/* ------------------------------------------------------------------ *
   Setup
 * ------------------------------------------------------------------ */

export function flatQuestions(test: MockTest): Question[] {
  return questionsForTest(test);
}

/** Section id for each position in the flattened list. */
export function sectionIdAt(test: MockTest, index: number): string {
  let seen = 0;
  for (const section of test.sections) {
    if (index < seen + section.questionIds.length) return section.id;
    seen += section.questionIds.length;
  }
  return test.sections[test.sections.length - 1]?.id ?? "";
}

/** First position belonging to a section. */
export function firstIndexOfSection(test: MockTest, sectionId: string): number {
  let seen = 0;
  for (const section of test.sections) {
    if (section.id === sectionId) return seen;
    seen += section.questionIds.length;
  }
  return 0;
}

/**
 * How long the clock starts at.
 *
 * A locked paper runs a clock per section, so the opening value is the first
 * section's duration rather than the paper's. An untimed sample set gets
 * `Infinity`, which the timer renders as a dash rather than counting.
 */
export function initialSeconds(test: MockTest): number {
  if (test.totalMinutes === 0) return Number.POSITIVE_INFINITY;
  if (test.sectionLock) {
    const first = test.sections[0];
    return (first?.durationMinutes ?? test.totalMinutes) * 60;
  }
  return test.totalMinutes * 60;
}

export function createAttempt(test: MockTest): Attempt {
  const responses: Record<string, Response> = {};
  for (const question of flatQuestions(test)) {
    responses[question.id] = { status: "not-visited", secondsSpent: 0 };
  }

  return {
    testSlug: test.slug,
    startedAt: Date.now(),
    currentIndex: 0,
    currentSectionId: test.sections[0]?.id ?? "",
    lockedSectionIds: [],
    responses,
    secondsRemaining: initialSeconds(test),
  };
}

/* ------------------------------------------------------------------ *
   Transitions

   `working` — what is currently ticked or typed — lives in the player, not
   here, because it is not part of the attempt until a Save commits it. That
   distinction is the whole reason Mark for Review & Next behaves the way it
   does; see the note on that action below.
 * ------------------------------------------------------------------ */

export type Working = { optionIds: string[] } | { value: string } | null;

const isEmpty = (working: Working): boolean => {
  if (!working) return true;
  if ("optionIds" in working) return working.optionIds.length === 0;
  return working.value.trim() === "";
};

/** Marks the question at `index` visited, if it was not already. */
export function visit(attempt: Attempt, questionId: string): Attempt {
  const current = attempt.responses[questionId];
  if (!current || current.status !== "not-visited") return attempt;

  return {
    ...attempt,
    responses: { ...attempt.responses, [questionId]: { ...current, status: "not-answered" } },
  };
}

/** Save, or Save & Mark for Review. */
export function saveResponse(
  attempt: Attempt,
  questionId: string,
  working: Working,
  markForReview: boolean,
): Attempt {
  const current = attempt.responses[questionId] ?? { status: "not-visited", secondsSpent: 0 };
  const empty = isEmpty(working);

  const status: QuestionStatus = empty
    ? markForReview
      ? "marked"
      : "not-answered"
    : markForReview
      ? "answered-marked"
      : "answered";

  return {
    ...attempt,
    responses: {
      ...attempt.responses,
      [questionId]: {
        ...current,
        status,
        saved: empty ? undefined : (working as NonNullable<Working>),
      },
    },
  };
}

/**
 * Mark for Review & Next — deliberately does **not** save.
 *
 * This surprises people, and it is faithful: in the real paper, ticking an
 * option and then pressing Mark for Review & Next does not record the tick.
 * Candidates lose marks to this every year, which is an argument for practising
 * against it rather than for quietly fixing it. The instructions screen calls
 * it out, and the confirmation before submit shows the counts so it is
 * recoverable.
 *
 * A question that already holds a saved answer keeps it and becomes
 * "answered & marked"; one that does not becomes "marked".
 */
export function markForReview(attempt: Attempt, questionId: string): Attempt {
  const current = attempt.responses[questionId] ?? { status: "not-visited", secondsSpent: 0 };

  return {
    ...attempt,
    responses: {
      ...attempt.responses,
      [questionId]: {
        ...current,
        status: current.saved ? "answered-marked" : "marked",
      },
    },
  };
}

/** Clear Response — wipes the committed answer as well as the working one. */
export function clearResponse(attempt: Attempt, questionId: string): Attempt {
  const current = attempt.responses[questionId] ?? { status: "not-visited", secondsSpent: 0 };
  const stillMarked = current.status === "marked" || current.status === "answered-marked";

  return {
    ...attempt,
    responses: {
      ...attempt.responses,
      [questionId]: {
        ...current,
        saved: undefined,
        status: stillMarked ? "marked" : "not-answered",
      },
    },
  };
}

export function addSeconds(attempt: Attempt, questionId: string, seconds: number): Attempt {
  const current = attempt.responses[questionId];
  if (!current) return attempt;

  return {
    ...attempt,
    responses: {
      ...attempt.responses,
      [questionId]: { ...current, secondsSpent: current.secondsSpent + seconds },
    },
  };
}

/* ------------------------------------------------------------------ *
   Counts — the palette legend, and the pre-submit summary
 * ------------------------------------------------------------------ */

export type StatusCounts = Record<QuestionStatus, number>;

export function countStatuses(test: MockTest, attempt: Attempt): StatusCounts {
  const counts: StatusCounts = {
    "not-visited": 0,
    "not-answered": 0,
    answered: 0,
    marked: 0,
    "answered-marked": 0,
  };

  for (const question of flatQuestions(test)) {
    const status = attempt.responses[question.id]?.status ?? "not-visited";
    counts[status] += 1;
  }

  return counts;
}

/* ------------------------------------------------------------------ *
   Scoring
 * ------------------------------------------------------------------ */

export type QuestionResult = {
  question: Question;
  status: QuestionStatus;
  /** What the candidate committed, if anything. */
  saved?: Response["saved"];
  outcome: "correct" | "incorrect" | "skipped";
  marksAwarded: number;
  secondsSpent: number;
};

export type AttemptResult = {
  test: MockTest;
  results: QuestionResult[];
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  /** Correct as a share of attempted, not of total. */
  accuracy: number;
  totalSeconds: number;
  sections: {
    id: string;
    label: string;
    score: number;
    maxScore: number;
    correct: number;
    incorrect: number;
    skipped: number;
    secondsSpent: number;
  }[];
  topics: { topic: string; correct: number; total: number; secondsSpent: number }[];
};


/* ------------------------------------------------------------------ *
   Persistence

   sessionStorage, so a refresh or an accidental tab close does not cost the
   candidate the sitting. Per-tab rather than shared, which is right: two
   attempts at once in two tabs would otherwise overwrite each other's timers.

   Every access is wrapped — a private window or blocked site data throws on
   read, and losing storage must degrade to "the timer restarts" rather than
   to a blank screen.
 * ------------------------------------------------------------------ */

const keyFor = (testSlug: string) => `tcp.practice.attempt.${testSlug}`;

export function loadAttempt(testSlug: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(keyFor(testSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attempt;
    if (parsed.testSlug !== testSlug) return null;

    /*
      `JSON.stringify(Infinity)` is the string "null" — JSON has no way to spell
      infinity — so an untimed paper's clock comes back as `null` and every
      arithmetic on it silently yields NaN. Restoring the sentinel here, at the
      one place a stored attempt re-enters the app, keeps that quirk of the
      transport from leaking into the timer.
    */
    if (!Number.isFinite(parsed.secondsRemaining)) {
      parsed.secondsRemaining = Number.POSITIVE_INFINITY;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function persistAttempt(attempt: Attempt): void {
  try {
    sessionStorage.setItem(keyFor(attempt.testSlug), JSON.stringify(attempt));
  } catch {
    /* Storage unavailable — the attempt still works, it just will not survive. */
  }
}

export function discardAttempt(testSlug: string): void {
  try {
    sessionStorage.removeItem(keyFor(testSlug));
  } catch {
    /* As above. */
  }
}

/** "02:59:39" for the header clock; an em dash for an untimed set. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** "1m 45s" for the per-question time analysis. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}s`;
  return `${Math.floor(safe / 60)}m ${safe % 60}s`;
}

/* ------------------------------------------------------------------ *
   The result of a submitted attempt

   The server scores the attempt and returns the result. It is kept in
   sessionStorage so the result screen can show it after the navigation.
 * ------------------------------------------------------------------ */

const resultKeyFor = (testSlug: string) => `tcp.practice.result.${testSlug}`;

export function storeResult(testSlug: string, result: AttemptResult): void {
  try {
    sessionStorage.setItem(resultKeyFor(testSlug), JSON.stringify(result));
  } catch {
    /* Storage unavailable: the result screen will say there is nothing to show. */
  }
}

export function loadResult(testSlug: string): AttemptResult | null {
  try {
    const raw = sessionStorage.getItem(resultKeyFor(testSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttemptResult;
    return parsed.test?.slug === testSlug ? parsed : null;
  } catch {
    return null;
  }
}
