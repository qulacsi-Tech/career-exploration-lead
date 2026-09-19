import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { exams } from "@/lib/mock-data";
import { testsForExam } from "@/lib/practice-data";
import { TestCard } from "@/components/practice/test-card";

export function generateStaticParams() {
  return exams.map((exam) => ({ slug: exam.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = exams.find((e) => e.slug === slug);
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
  const { slug } = await params;
  const exam = exams.find((e) => e.slug === slug);
  if (!exam) notFound();

  const tests = testsForExam(slug);
  const short = exam.name.match(/\(([^)]+)\)/)?.[1] ?? exam.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Exams", href: "/exams" },
          { label: short, href: `/exams/${slug}` },
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
