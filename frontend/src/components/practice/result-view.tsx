"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";
import type { MockTest } from "@/lib/practice-data";
import {
  type AttemptResult,
  type QuestionResult,
  discardAttempt,
  formatDuration,
  loadAttempt,
  scoreAttempt,
} from "@/lib/practice-attempt";
import { QuestionContent } from "@/components/practice/question-content";
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
  acceptingColleges,
}: {
  test: MockTest;
  acceptingColleges: { slug: string; name: string; city: string; feesRange: string }[];
}) {
  const result = useMemo(() => {
    const attempt = loadAttempt(test.slug);
    if (!attempt || !attempt.submittedAt) return null;
    return scoreAttempt(test, attempt);
  }, [test]);

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Header test={test} result={result} />
      <ScoreTiles result={result} />
      <Percentile result={result} />

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

      <Section title="Solutions">
        <SolutionReview result={result} />
      </Section>

      {acceptingColleges.length > 0 && <CollegesBand test={test} colleges={acceptingColleges} />}
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
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Header({ test, result }: { test: MockTest; result: AttemptResult }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Result · {test.title}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
          {result.score} <span className="text-ink-faint">/ {result.maxScore}</span>
        </h1>
      </div>

      <div className="flex shrink-0 gap-2">
        <Link
          href={`/exams/${test.examSlug}/practice`}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          All tests
        </Link>
        <Link
          href={`/practice/attempt/${test.slug}`}
          onClick={() => discardAttempt(test.slug)}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Retake
        </Link>
      </div>
    </div>
  );
}

function ScoreTiles({ result }: { result: AttemptResult }) {
  const tiles = [
    { label: "Attempted", value: `${result.attempted}/${result.results.length}` },
    { label: "Correct", value: String(result.correct) },
    { label: "Incorrect", value: String(result.incorrect) },
    { label: "Accuracy", value: `${Math.round(result.accuracy)}%` },
    { label: "Time taken", value: formatDuration(result.totalSeconds) },
  ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-line bg-surface px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {tile.label}
          </dt>
          <dd className="mt-1 font-display text-xl font-bold text-ink">{tile.value}</dd>
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
function Percentile({ result }: { result: AttemptResult }) {
  const share = result.maxScore === 0 ? 0 : Math.max(0, result.score) / result.maxScore;
  // A gentle S-curve: most candidates cluster mid-range, so equal score steps
  // near the middle move the percentile more than steps at either extreme.
  const percentile = Math.round(100 / (1 + Math.exp(-9 * (share - 0.45))));

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3">
      <p className="font-display text-lg font-bold text-ink">
        {percentile}
        <span className="text-sm font-semibold text-ink-soft"> percentile</span>
      </p>
      <p className="text-xs leading-relaxed text-ink-soft">
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
        <thead className="bg-bg-alt text-left text-xs uppercase tracking-wider text-ink-faint">
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

  const correctText =
    question.correct.kind === "value"
      ? String(question.correct.value)
      : question.correct.optionIds
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
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Solution
            </p>
            <QuestionContent doc={question.solution} className="text-sm" />
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

/* ------------------------------------------------------------------ *
   Back into the platform
 * ------------------------------------------------------------------ */

/**
 * Colleges that accept this exam.
 *
 * The reason the practice module earns its place. A candidate who has just been
 * shown what they are scoring is a candidate thinking about where that score
 * takes them, and this is the one moment on the site where that question is
 * already in their head.
 */
function CollegesBand({
  test,
  colleges,
}: {
  test: MockTest;
  colleges: { slug: string; name: string; city: string; feesRange: string }[];
}) {
  return (
    <section className="mt-12 rounded-2xl border border-brand/30 bg-brand-soft/40 p-6">
      <h2 className="font-display text-xl font-bold text-ink">
        Colleges that accept this exam
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Shortlist now and a counsellor can talk you through where your score puts you.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {colleges.slice(0, 3).map((college) => (
          <li key={college.slug}>
            <Link
              href={`/college/${college.slug}`}
              className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-brand hover:shadow-sm"
            >
              <span className="font-display text-sm font-bold text-ink group-hover:text-brand">
                {college.name}
              </span>
              <span className="mt-1 text-xs text-ink-soft">{college.city}</span>
              <span className="mt-auto pt-3 text-xs font-medium text-ink-soft">
                {college.feesRange}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/exams/${test.examSlug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
      >
        All colleges accepting this exam
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
