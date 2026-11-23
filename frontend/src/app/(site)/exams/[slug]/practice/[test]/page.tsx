import Link from "next/link";
import { SignInLink } from "@/components/college/college-actions";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AttemptsNote } from "@/components/practice/attempts-note";
import { getExam, getPracticeTest, getPracticeTests } from "@/lib/api";
import { examHref } from "@/lib/entity-url";
import { resolveByKey } from "@/lib/entity-resolve";
import { markingSummary, questionCount } from "@/lib/practice-data";
import { resolveInstructions, withMarking } from "@/lib/practice-instructions";

export async function generateStaticParams() {
  try {
    const tests = await getPracticeTests();
    return tests.map((test) => ({ slug: test.examSlug, test: test.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ test: string }>;
}): Promise<Metadata> {
  const { test: testSlug } = await params;
  const test = await getPracticeTest(testSlug);
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
  const { slug: key, test: testSlug } = await params;
  const test = await getPracticeTest(testSlug);
  const exam = await resolveByKey(key, getExam, (e) => `${examHref(e)}/practice/${testSlug}`);
  if (!test || !test.isPublished || test.examSlug !== exam.slug) notFound();

  const short = exam.name.match(/\(([^)]+)\)/)?.[1] ?? exam.name;
  const count = questionCount(test);
  const instructions = resolveInstructions(test);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          { label: short, href: examHref(exam) },
          { label: "Practice", href: `${examHref(exam)}/practice` },
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
            <dt className="text-[11px] font-semibold text-ink-faint">
              {item.label}
            </dt>
            <dd className="mt-1 font-display text-base font-bold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <AttemptsNote testSlug={test.slug} allowed={test.attemptsAllowed} gapMinutes={test.retakeGapMinutes ?? null} />

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink">{instructions.title}</h2>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-soft">
          {instructions.items.map((item, i) => (
            <li key={i}>
              {item.title && <strong className="font-semibold text-ink">{item.title} </strong>}
              {withMarking(item.text, markingSummary(test))}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <SignInLink
          href={`/practice/attempt/${test.slug}`}
          reason="Sign in to take this practice test. It takes a minute."
          allowAdmin
          className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          {test.totalMinutes > 0 ? "Start test" : "Begin"}
        </SignInLink>
        <Link
          href={`${examHref(exam)}/practice`}
          className="text-sm font-semibold text-ink-soft transition hover:text-brand"
        >
          Back to all tests
        </Link>
      </div>

      {instructions.note && <p className="mt-3 text-xs text-ink-faint">{instructions.note}</p>}
    </div>
  );
}
