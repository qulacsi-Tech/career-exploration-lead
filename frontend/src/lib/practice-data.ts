/**
 * Practice tests: the types, and helpers that work on a test once it is loaded.
 *
 * The content itself lives in the database and comes from the practice API. It
 * is not in this file, so it is not in the page bundle. A question as served to
 * a candidate has no `correct` or `solution`; those arrive only in the result of
 * a submitted attempt, from the server that scored it. See
 * `docs/2026-09-19-exam-practice-module-plan.md` for the model's reasoning.
 *
 * ## Format is not a question type
 *
 * `QuestionType` is the *answer mechanic* — how a response is given. Whether a
 * question is text, a figure, or both is carried by the rich-text document in
 * `stem` and in each option's `body`. The two are orthogonal.
 *
 * ## Shared stimuli
 *
 * A CAT reading passage carries four to six questions. Questions reference a
 * `Stimulus` by id, so the player can tell it is still showing the same passage
 * and leave the reader's scroll position alone between questions in a set.
 */

import type { RichTextDoc } from "@/lib/rich-text";

/* ------------------------------------------------------------------ *
   Types
 * ------------------------------------------------------------------ */

/** How a response is given. Not the format — see the note above. */
export type QuestionType = "mcq-single" | "mcq-multi" | "tita";

/** A passage, caselet or figure shared by a group of questions. */
export type Stimulus = {
  id: string;
  kind: "passage" | "caselet" | "figure";
  /** Shown above the pane so a candidate knows what they are looking at. */
  label: string;
  body: RichTextDoc;
};

export type QuestionOption = {
  id: string;
  /** A document, so an option can be text, a figure, or both. */
  body: RichTextDoc;
};

/**
 * The correct response.
 *
 * Only present on a result, after the attempt is submitted. A question served
 * to a candidate before that has no `correct`.
 */
export type CorrectAnswer =
  | { kind: "options"; optionIds: string[] }
  | { kind: "value"; value: number; tolerance: number };

export type Question = {
  id: string;
  examSlug: string;
  sectionId: string;
  /** Set when this question belongs to a shared-stimulus group. */
  stimulusId?: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  type: QuestionType;
  stem: RichTextDoc;
  /** Absent for TITA. */
  options?: QuestionOption[];
  /** Served only in a submitted attempt's result. */
  correct?: CorrectAnswer;
  /** Served only in a submitted attempt's result. */
  solution?: RichTextDoc;
  marks: number;
  /** Positive number, subtracted when wrong. 0 where the exam has no penalty. */
  negativeMarks: number;
  /** What a prepared candidate should need. Drives the time analysis. */
  expectedSeconds: number;
};

export type TestSection = {
  id: string;
  label: string;
  questionIds: string[];
  /**
   * Set only where the section is separately timed. With `sectionLock` on, this
   * is how long the candidate is held in it.
   */
  durationMinutes?: number;
};

/** A test's details, as shown on a card. No questions. */
export type TestSummary = {
  slug: string;
  examSlug: string;
  title: string;
  kind: "full-mock" | "sectional" | "previous-year" | "sample";
  /** One line on the card and the instructions screen. */
  summary: string;
  totalMinutes: number;
  sectionLock: boolean;
  languages: string[];
  /** null means unlimited retakes. */
  attemptsAllowed: number | null;
  isFree: boolean;
  questionCount: number;
  sectionCount: number;
  markingSummary: string;
};

/** A full test: its structure, and the questions and stimuli it uses, in paper order. */
export type MockTest = TestSummary & {
  sections: TestSection[];
  /**
   * CAT holds a candidate in each section for its full duration and will not
   * let them return; NMAT lets them choose the order. A simulator that gets
   * this wrong is worthless to a candidate who knows the real paper.
   */
  isPublished: boolean;
  /** Every question in paper order, as served (no answers). */
  questions: Question[];
  /** The stimuli those questions use. */
  stimuli: Stimulus[];
};

/* ------------------------------------------------------------------ *
   Helpers on a loaded test
 * ------------------------------------------------------------------ */

/** Every question in paper order. */
export function questionsForTest(test: MockTest): Question[] {
  return test.questions;
}

export function stimulusById(test: MockTest, id: string | undefined): Stimulus | undefined {
  return id ? test.stimuli.find((s) => s.id === id) : undefined;
}

export function questionCount(test: MockTest): number {
  return test.sections.reduce((total, section) => total + section.questionIds.length, 0);
}

/** Highest achievable score, for the results screen's denominator. */
export function maxScore(test: MockTest): number {
  return questionsForTest(test).reduce((total, q) => total + q.marks, 0);
}

/**
 * The marking scheme in one line. Reads the questions rather than restating a
 * scheme on the test, because the two drift.
 */
export function markingSummary(test: MockTest): string {
  const qs = questionsForTest(test);
  if (qs.length === 0) return "No questions";

  const marks = [...new Set(qs.map((q) => q.marks))];
  const penalties = [...new Set(qs.map((q) => q.negativeMarks))].filter((p) => p > 0);

  const positive = marks.length === 1 ? `+${marks[0]}` : `+${Math.min(...marks)} to +${Math.max(...marks)}`;
  if (penalties.length === 0) return `${positive} per correct answer · no negative marking`;

  const negative = penalties.length === 1 ? `−${penalties[0]}` : `−${Math.min(...penalties)} to −${Math.max(...penalties)}`;
  return `${positive} per correct answer · ${negative} per wrong answer`;
}
