import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { exams } from "@/lib/mock-data";
import {
  markingSummary,
  publishedTests,
  questionCount,
  testBySlug,
} from "@/lib/practice-data";

export function generateStaticParams() {
  return publishedTests().map((test) => ({ slug: test.examSlug, test: test.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ test: string }>;
}): Promise<Metadata> {
  const { test: testSlug } = await params;
  const test = testBySlug(testSlug);
  if (!test) return { title: "Test not found" };

  return {
    title: `${test.title} — instructions`,
    description: test.summary,
  };
}

/**
 * The instructions screen.
 *
 * Every real exam has one and candidates expect to read it before the clock
 * starts, so it is a page rather than a dialog over the player — the clock must
 * not be running while someone is still reading how the paper works.
 *
 * It is also where the sign-up gate lands (workstream S). Deliberately public
 * and indexable: putting the gate at the route boundary instead would hide the
 * whole module from search, which is the reason it sits under the exam pages.
 */
export default async function TestInstructionsPage({
  params,
}: {
  params: Promise<{ slug: string; test: string }>;
}) {
  const { slug, test: testSlug } = await params;
  const test = testBySlug(testSlug);
  if (!test || !test.isPublished || test.examSlug !== slug) notFound();

  const exam = exams.find((e) => e.slug === slug);
  const short = exam?.name.match(/\(([^)]+)\)/)?.[1] ?? exam?.name ?? slug;
  const count = questionCount(test);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          { label: short, href: `/exams/${slug}` },
          { label: "Practice", href: `/exams/${slug}/practice` },
          { label: test.title },
        ]}
      />

      <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">{test.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{test.summary}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Duration", value: test.totalMinutes > 0 ? `${test.totalMinutes} min` : "Untimed" },
          { label: "Questions", value: String(count) },
          { label: "Sections", value: String(test.sections.length) },
          { label: "Language", value: test.languages.join(", ") },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {item.label}
            </dt>
            <dd className="mt-1 font-display text-base font-bold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink">Before you begin</h2>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-soft">
          <li>
            <strong className="font-semibold text-ink">Marking.</strong> {markingSummary(test)}.
          </li>

          {test.sectionLock ? (
            <li>
              <strong className="font-semibold text-ink">Sections are locked.</strong> Each section
              runs on its own clock, and once its time is up it closes for good — you cannot go
              back to it. This is how the real paper behaves.
            </li>
          ) : (
            <li>
              <strong className="font-semibold text-ink">Sections are open.</strong> You can move
              between them freely for as long as the overall clock is running.
            </li>
          )}

          {/*
            The one instruction worth spelling out. Mark for Review & Next does
            not save what is currently ticked — faithful to the real paper, and
            the mistake candidates lose marks to every year. Practising against
            it is the point; being surprised by it is not.
          */}
          <li>
            <strong className="font-semibold text-ink">
              Mark for Review &amp; Next does not save your answer.
            </strong>{" "}
            To record an answer and flag it to come back to, use{" "}
            <strong className="font-semibold text-ink">Save &amp; Mark for Review</strong>. A
            question marked without a saved answer scores nothing — exactly as in the real exam.
          </li>

          <li>
            <strong className="font-semibold text-ink">Your progress is kept.</strong> Refreshing
            or accidentally closing the tab will not lose the sitting — reopen it and the paper
            resumes where you left off, with the clock where it should be.
          </li>

          <li>
            <strong className="font-semibold text-ink">The palette.</strong> Numbers down the side
            are colour- and shape-coded: green answered, red seen but unanswered, violet marked for
            review. A violet tile with a tick has an answer saved and will be marked.
          </li>
        </ol>
      </section>

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Link
          href={`/practice/attempt/${test.slug}`}
          className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          {test.totalMinutes > 0 ? "Start test" : "Begin"}
        </Link>
        <Link
          href={`/exams/${slug}/practice`}
          className="text-sm font-semibold text-ink-soft transition hover:text-brand"
        >
          Back to all tests
        </Link>
      </div>

      {test.totalMinutes > 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          The clock starts as soon as you open the paper.
        </p>
      )}
    </div>
  );
}
