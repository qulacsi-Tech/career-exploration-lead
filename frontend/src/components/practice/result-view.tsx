"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleSlash, Clock, Gauge, Sparkles, Target, Timer, XCircle } from "lucide-react";
import type { ExamCutoffRow } from "@/lib/api";
import { ExamStatsCard } from "@/components/exams/exam-stats-card";
import { ExamLeaderboard } from "@/components/exams/exam-leaderboard";
import { EligibleColleges } from "@/components/practice/eligible-colleges";
import type { MockTest } from "@/lib/practice-data";
import {
  type AttemptResult,
  type QuestionResult,
  discardAttempt,
  formatDuration,
  loadResult,
} from "@/lib/practice-attempt";
import { QuestionContent } from "@/components/practice/question-content";
import { AttemptPopup } from "@/components/practice/attempt-popup";
import { SectionScoresChart } from "@/components/practice/section-scores-chart";
import { RouteMessage, RouteAction } from "@/components/ui/route-message";

/**
 * What the sitting scored, and why.
 *
 * Client-side because the attempt lives in sessionStorage until there is an API
 * to read it from. When attempts persist, this takes the scored result as a
 * prop from the server and nothing below changes.
 */

export function ResultView({
  test,
  cutoffs,
  shortName,
}: {
  test: MockTest;
  /** The cut-offs colleges list for this exam, to match the result against. */
  cutoffs: ExamCutoffRow[];
  /** The exam's short name ("CAT"). */
  shortName: string;
}) {
  // Scored by the server when the paper was submitted. Nothing is scored here.
  const result = useMemo(() => loadResult(test.slug), [test.slug]);

  if (!result) {
    return (
      <RouteMessage
        code="—"
        title="We could not find that attempt"
        description="Results are held for the browser session that took the test, so they do not survive closing the tab or opening the link elsewhere. Taking the paper again will produce a fresh result."
      >
        <RouteAction href={`/exams/${test.examSlug}/practice`}>Back to practice tests</RouteAction>
      </RouteMessage>
    );
  }

  return (
    <div className="mx-auto max-w-[88rem] px-5 pb-12 pt-4 sm:px-8 lg:px-12">
      <AttemptPopup testSlug={test.slug} examSlug={test.examSlug} attempts={result.attempts} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
      <Header test={test} result={result} />
      <ScoreTiles result={result} />
      <Percentile result={result} />

      {/* Where the score can take the student: the colleges whose cut-off it clears, or the nearest targets. */}
      <EligibleColleges rows={cutoffs} percentile={indicativePercentile(result)} examSlug={test.examSlug} shortName={shortName} />

      <Section title="Section by section">
        <SectionScoresChart result={result} />
      </Section>

      <Section
        title="Where the time went"
        description="Measured against how long a prepared candidate should need. The questions at the top are the ones that cost you."
      >
        <TimeAnalysis result={result} />
      </Section>

      <Section
        title="Topics"
        description="Weakest first — this is the list to revise from."
      >
        <TopicTable result={result} />
      </Section>

      <Section title="Solutions" description="Every question, your answer and the right one, with the working.">
        <SolutionReview result={result} />
      </Section>
      </div>

      {/* Where the student stands among everyone who practised for this exam, and the top of the board. */}
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <ExamStatsCard examSlug={test.examSlug} shortName={shortName} hasTests />
        <ExamLeaderboard examSlug={test.examSlug} />
      </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Layout helpers
 * ------------------------------------------------------------------ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="relative pl-4 font-display text-xl font-bold text-ink before:absolute before:bottom-1 before:left-0 before:top-1 before:w-1.5 before:rounded-full before:bg-brand sm:text-2xl">{title}</h2>
      {description && (
        <p className="mt-1.5 flex items-center gap-1.5 pl-4 text-sm italic text-brand-ink/80">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
          {description}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A cheer from the share of marks scored. */
function scoreLine(share: number): string {
  if (share >= 0.8) return "Outstanding! You're in topper territory.";
  if (share >= 0.6) return "Strong showing. The top is within reach.";
  if (share >= 0.4) return "Solid base. Tighten the weak spots and climb.";
  if (share > 0) return "Every attempt teaches something. Review and go again!";
  return "A tough one. The solutions below are your best teacher.";
}

function Header({ test, result }: { test: MockTest; result: AttemptResult }) {
  const share = result.maxScore === 0 ? 0 : Math.max(0, result.score) / result.maxScore;
  return (
    <header className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="bg-gradient-to-br from-brand-soft via-bg-alt to-surface p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-brand">Your result</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{test.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm italic text-brand-ink/80">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
              {scoreLine(share)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/practice/attempt/${test.slug}`}
                onClick={() => discardAttempt(test.slug)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                Retake
              </Link>
              <Link
                href={`/exams/${test.examSlug}/practice`}
                className="rounded-lg border border-brand bg-surface px-4 py-2 text-sm font-bold text-brand transition hover:bg-brand-soft"
              >
                All tests
              </Link>
            </div>
          </div>

          {/* The score, the star of the page. */}
          <div className="shrink-0 rounded-2xl bg-surface px-6 py-4 text-center shadow-sm ring-1 ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Score</p>
            <p className="mt-1 flex items-baseline justify-center gap-1">
              <span className="bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display text-6xl font-extrabold leading-none text-transparent">{result.score}</span>
              <span className="font-display text-2xl font-extrabold text-ink-faint">/{result.maxScore}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-brand">{Math.round(share * 100)}% of the marks</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function ScoreTiles({ result }: { result: AttemptResult }) {
  const tiles = [
    { icon: Target, label: "Attempted", value: `${result.attempted}/${result.results.length}`, tone: "text-ink", hint: result.attempted === result.results.length ? "Went for every one" : "Some left untouched" },
    { icon: CheckCircle2, label: "Correct", value: String(result.correct), tone: "text-emerald-600", hint: "Nailed it" },
    { icon: XCircle, label: "Incorrect", value: String(result.incorrect), tone: "text-red-600", hint: "Lessons in disguise" },
    { icon: Gauge, label: "Accuracy", value: `${Math.round(result.accuracy)}%`, tone: "text-brand", hint: "Of those attempted" },
    { icon: Timer, label: "Time taken", value: formatDuration(result.totalSeconds), tone: "text-ink", hint: "On the clock" },
  ];

  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {tiles.map(({ icon: Icon, label, value, tone, hint }) => (
        <div key={label} className="group rounded-2xl border border-line bg-surface px-4 py-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm">
          <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-faint">
            <Icon className="h-4 w-4 text-brand transition group-hover:scale-110" aria-hidden="true" />
            {label}
          </dt>
          <dd className={`mt-1 font-display text-3xl font-extrabold leading-tight ${tone}`}>{value}</dd>
          <p className="text-xs italic text-brand-ink/70">{hint}</p>
        </div>
      ))}
    </dl>
  );
}

/**
 * Indicative percentile.
 *
 * Computed against a seeded curve, not against other candidates — there are no
 * other candidates yet. It is labelled as indicative in the panel rather than
 * in a footnote, because a percentile is the single number a candidate will
 * quote to someone else, and presenting a modelled one as measured is the one
 * thing here they could later catch us on.
 *
 * Replaced by a real ranking once attempt volume supports it; the display does
 * not change, only the source.
 */
function indicativePercentile(result: AttemptResult): number {
  const share = result.maxScore === 0 ? 0 : Math.max(0, result.score) / result.maxScore;
  // A gentle S-curve: most candidates cluster mid-range, so equal score steps
  // near the middle move the percentile more than steps at either extreme.
  return Math.round(100 / (1 + Math.exp(-9 * (share - 0.45))));
}

function Percentile({ result }: { result: AttemptResult }) {
  const percentile = indicativePercentile(result);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-gold/40 bg-gold-soft px-5 py-4">
      <p className="flex items-baseline gap-1.5">
        <span className="font-display text-5xl font-extrabold leading-none text-gold">{percentile}</span>
        <span className="text-sm font-bold text-ink-soft">percentile</span>
      </p>
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink-soft">
        <strong className="font-semibold">Indicative.</strong> Modelled from the marking scheme,
        not ranked against other candidates — real percentiles begin once enough attempts exist to
        rank against.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Analysis
 * ------------------------------------------------------------------ */

/**
 * The questions that ate the clock.
 *
 * Only ones actually spent time on, sorted by overrun against the expected
 * time. A question skipped in two seconds is not a time problem, and listing it
 * here would bury the ones that are.
 */
function TimeAnalysis({ result }: { result: AttemptResult }) {
  const overruns = result.results
    .filter((row) => row.secondsSpent >= 5)
    .map((row) => ({ row, overrun: row.secondsSpent - row.question.expectedSeconds }))
    .filter((entry) => entry.overrun > 0)
    .sort((a, b) => b.overrun - a.overrun)
    .slice(0, 5);

  if (overruns.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-bg-alt px-4 py-3 text-sm text-ink-soft">
        Nothing ran over its expected time. Pace was not the limiting factor here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {overruns.map(({ row, overrun }) => (
        <li
          key={row.question.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3"
        >
          <span className="min-w-0 text-sm">
            <span className="font-semibold text-ink">{row.question.topic}</span>
            <span className="text-ink-faint"> · {outcomeLabel(row.outcome)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(row.secondsSpent)}
            <span className="text-ink-faint">
              (expected {formatDuration(row.question.expectedSeconds)}, over by{" "}
              {formatDuration(overrun)})
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TopicTable({ result }: { result: AttemptResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-bg-alt text-left text-xs text-ink-faint">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Topic</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Correct</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Time</th>
          </tr>
        </thead>
        <tbody>
          {result.topics.map((topic) => (
            <tr key={topic.topic} className="border-t border-line-soft">
              <td className="px-4 py-2.5 font-medium text-ink">{topic.topic}</td>
              <td className="px-4 py-2.5 text-ink-soft tabular-nums">
                {topic.correct}/{topic.total}
              </td>
              <td className="px-4 py-2.5 text-ink-soft tabular-nums">
                {formatDuration(topic.secondsSpent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
   Solutions
 * ------------------------------------------------------------------ */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "incorrect", label: "Incorrect" },
  { id: "skipped", label: "Skipped" },
  { id: "marked", label: "Marked" },
] as const;

function SolutionReview({ result }: { result: AttemptResult }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = result.results.filter((row) => {
    if (filter === "all") return true;
    if (filter === "marked") return row.status === "marked" || row.status === "answered-marked";
    return row.outcome === filter;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const active = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-bg-alt px-4 py-3 text-sm text-ink-soft">
          Nothing in this category.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => (
            <SolutionCard
              key={row.question.id}
              row={row}
              number={result.results.indexOf(row) + 1}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function SolutionCard({ row, number }: { row: QuestionResult; number: number }) {
  const [open, setOpen] = useState(false);
  const { question } = row;

  const correct = question.correct;
  const correctText = !correct
    ? "—"
    : correct.kind === "value"
      ? String(correct.value)
      : correct.optionIds
          .map((id) => `(${(question.options ?? []).findIndex((o) => o.id === id) + 1})`)
          .join(", ");

  const yourText = !row.saved
    ? "Not answered"
    : "value" in row.saved
      ? row.saved.value
      : row.saved.optionIds
          .map((id) => `(${(question.options ?? []).findIndex((o) => o.id === id) + 1})`)
          .join(", ");

  return (
    <li className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-bg-alt"
      >
        <OutcomeGlyph outcome={row.outcome} />

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            Q{number} · {question.topic}
          </span>
          <span className="block text-xs text-ink-soft">
            Your answer: {yourText} · Correct: {correctText} ·{" "}
            {formatDuration(row.secondsSpent)}
          </span>
        </span>

        <span
          className={`shrink-0 font-display text-sm font-bold tabular-nums ${
            row.marksAwarded > 0
              ? "text-[var(--practice-answered)]"
              : row.marksAwarded < 0
                ? "text-[var(--practice-unanswered)]"
                : "text-ink-faint"
          }`}
        >
          {row.marksAwarded > 0 ? `+${row.marksAwarded}` : row.marksAwarded}
        </span>
      </button>

      {open && (
        <div className="border-t border-line-soft px-4 py-4">
          <QuestionContent doc={question.stem} className="text-sm" />
          <div className="mt-4 rounded-lg bg-bg-alt px-4 py-3">
            <p className="mb-1.5 text-[11px] font-semibold text-ink-faint">
              Solution
            </p>
            {question.solution ? (
              <QuestionContent doc={question.solution} className="text-sm" />
            ) : (
              <p className="text-sm text-ink-soft">No solution has been written for this question yet.</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function OutcomeGlyph({ outcome }: { outcome: QuestionResult["outcome"] }) {
  if (outcome === "correct") {
    return (
      <CheckCircle2
        aria-label="Correct"
        className="h-5 w-5 shrink-0 text-[var(--practice-answered)]"
      />
    );
  }
  if (outcome === "incorrect") {
    return (
      <XCircle
        aria-label="Incorrect"
        className="h-5 w-5 shrink-0 text-[var(--practice-unanswered)]"
      />
    );
  }
  return <CircleSlash aria-label="Skipped" className="h-5 w-5 shrink-0 text-ink-faint" />;
}

function outcomeLabel(outcome: QuestionResult["outcome"]): string {
  return outcome === "correct" ? "Correct" : outcome === "incorrect" ? "Incorrect" : "Skipped";
}
