import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getExam, getExamCutoffs, getPracticeTest } from "@/lib/api";
import { examShortName } from "@/lib/exam-insights";
import { ResultViewMount } from "@/components/practice/result-view-mount";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = await getPracticeTest(slug);
  return {
    title: test ? `${test.title} — your result` : "Result not found",
    // Per-attempt. Nothing to rank for, and indexing it would be indexing
    // one candidate's score.
    robots: { index: false, follow: true },
  };
}

/**
 * The result of a sitting, laid out like the exam pages: the score up top in big type, where it can take the student
 * (the colleges whose cut-off it clears), the analysis, and on the right their standing and the leaderboard.
 *
 * The cut-offs are read here, on the server, once; the result itself is matched against them in the browser, where
 * the scored attempt lives.
 */
export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = await getPracticeTest(slug);
  if (!test || !test.isPublished) notFound();

  const [exam, cutoffs] = await Promise.all([getExam(test.examSlug).catch(() => null), getExamCutoffs(test.examSlug)]);
  const shortName = exam ? examShortName(exam) : test.examSlug.toUpperCase();

  return (
    <>
      <div className="mx-auto max-w-[88rem] px-5 pt-6 sm:px-8 lg:px-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Exams", href: "/exams" },
            { label: exam?.name ?? test.examSlug, href: `/exams/${test.examSlug}` },
            { label: "Result" },
          ]}
        />
      </div>

      <ResultViewMount test={test} cutoffs={cutoffs} shortName={shortName} />
    </>
  );
}
