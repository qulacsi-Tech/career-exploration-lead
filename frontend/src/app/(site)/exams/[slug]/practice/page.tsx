import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getExam, getExamSlugs, getPracticeTests } from "@/lib/api";
import { examHref } from "@/lib/entity-url";
import { findByKey, resolveByKey } from "@/lib/entity-resolve";
import { TestCard } from "@/components/practice/test-card";

export async function generateStaticParams() {
  try {
    return (await getExamSlugs()).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: key } = await params;
  const exam = await findByKey(key, getExam).catch(() => null);
  if (!exam) return { title: "Exam not found" };

  const short = exam.name.match(/\(([^)]+)\)/)?.[1] ?? exam.name;
  return {
    title: `${short} Mock Tests & Practice Papers`,
    description: `Free and full-length ${short} practice tests with the real exam interface, detailed solutions and section-wise analysis.`,
  };
}

/**
 * Practice papers for one exam.
 *
 * Indexable, and deliberately so: "CAT mock test" is a query with real volume,
 * and nesting this under the exam it belongs to means the page inherits the
 * authority the exam page has already built rather than competing with it. The
 * player and the result are the parts that carry noindex.
 */
export default async function ExamPracticePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: key } = await params;
  const exam = await resolveByKey(key, getExam, (e) => `${examHref(e)}/practice`);
  const slug = exam.slug;

  const tests = await getPracticeTests(slug);
  const short = exam.name.match(/\(([^)]+)\)/)?.[1] ?? exam.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          { label: short, href: examHref(exam) },
          { label: "Practice" },
        ]}
      />

      <div className="mt-3 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {short} Practice Tests
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Papers that run in the same interface as the real exam — the question palette, the
          section timing and the marking scheme all behave the way they will on the day.
        </p>
      </div>

      {tests.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-line bg-bg-alt px-5 py-6 text-sm text-ink-soft">
          No practice papers for {short} yet. They are being written — the exam page has the dates
          and pattern in the meantime.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => (
            <TestCard key={test.slug} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}
