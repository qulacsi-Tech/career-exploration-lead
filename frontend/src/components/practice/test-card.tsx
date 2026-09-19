import Link from "next/link";
import { ArrowUpRight, Clock, FileText, Lock, Unlock } from "lucide-react";
import { type MockTest, markingSummary, questionCount } from "@/lib/practice-data";

/**
 * One practice paper, on the exam page and in the practice lists.
 *
 * The four facts a candidate decides on are duration, question count, marking
 * and whether the sections lock — so they are on the card rather than one click
 * away on the instructions screen. Marking in particular: a paper with negative
 * marking is a different exercise from one without, and finding that out after
 * starting is finding it out too late.
 */

const KIND_LABELS: Record<MockTest["kind"], string> = {
  "full-mock": "Full mock",
  sectional: "Sectional",
  "previous-year": "Previous year",
  sample: "Free sample",
};

export function TestCard({ test }: { test: MockTest }) {
  const count = questionCount(test);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-brand/50 hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-line bg-bg-alt px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
          {KIND_LABELS[test.kind]}
        </span>
        {test.isFree && (
          <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink">
            No account needed
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-base font-bold text-ink">{test.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{test.summary}</p>

      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Duration</dt>
          <Clock aria-hidden className="h-3.5 w-3.5 text-ink-faint" />
          <dd>{test.totalMinutes > 0 ? `${test.totalMinutes} min` : "Untimed"}</dd>
        </div>

        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Questions</dt>
          <FileText aria-hidden className="h-3.5 w-3.5 text-ink-faint" />
          <dd>
            {count} question{count === 1 ? "" : "s"}
          </dd>
        </div>

        {test.sections.length > 1 && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Section lock</dt>
            {test.sectionLock ? (
              <Lock aria-hidden className="h-3.5 w-3.5 text-ink-faint" />
            ) : (
              <Unlock aria-hidden className="h-3.5 w-3.5 text-ink-faint" />
            )}
            <dd>{test.sectionLock ? "Sections locked" : "Sections unlocked"}</dd>
          </div>
        )}
      </dl>

      <p className="mt-2 text-xs text-ink-faint">{markingSummary(test)}</p>

      {/* mt-auto on the wrapper, so the button lands on the same baseline in
          every card of a row however much summary text sits above it. */}
      <div className="mt-auto pt-5">
        <Link
          href={`/exams/${test.examSlug}/practice/${test.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Start test
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
