import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getColleges, getExam, getPracticeTest } from "@/lib/api";
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
 * The result of a sitting.
 *
 * Inside `(site)` rather than the bare `(exam)` group, unlike the player. The
 * clock has stopped, so the header and footer are no longer a distraction —
 * they are the way onward, which for this site means into college discovery.
 *
 * Colleges are matched here rather than in the client component so the join
 * runs once on the server and only the three that are shown cross the wire.
 */
export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const test = await getPracticeTest(slug);
  if (!test || !test.isPublished) notFound();

  const exam = await getExam(test.examSlug).catch(() => null);

  /*
    Colleges list the exams they accept by short code — "CAT", "NMAT",
    "MAH MBA CET" — while the exam record carries a full name with the code in
    brackets. Matching on either the bracketed code or a code that appears
    inside the name covers both spellings without a lookup table to maintain.
  */
  const code = exam?.name.match(/\(([^)]+)\)/)?.[1];
  const accepting = code
    ? await getColleges({ exam: code, limit: 12 })
        .then((r) => r.data)
        .catch(() => [])
    : [];

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Exams", href: "/exams" },
            { label: exam?.name ?? test.examSlug, href: `/exams/${test.examSlug}` },
            { label: "Result" },
          ]}
        />
      </div>

      <ResultViewMount
        test={test}
        acceptingColleges={accepting.map((college) => ({
          slug: college.slug,
          name: college.name,
          city: college.city,
          feesRange: college.feesRange,
        }))}
      />
    </>
  );
}
