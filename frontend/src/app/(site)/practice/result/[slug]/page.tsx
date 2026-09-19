import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { testBySlug } from "@/lib/practice-data";
import { exams, colleges } from "@/lib/mock-data";
import { ResultViewMount } from "@/components/practice/result-view-mount";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = testBySlug(slug);
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
  const test = testBySlug(slug);
  if (!test || !test.isPublished) notFound();

  const exam = exams.find((e) => e.slug === test.examSlug);

  /*
    Colleges list the exams they accept by short code — "CAT", "NMAT",
    "MAH MBA CET" — while the exam record carries a full name with the code in
    brackets. Matching on either the bracketed code or a code that appears
    inside the name covers both spellings without a lookup table to maintain.
  */
  const code = exam?.name.match(/\(([^)]+)\)/)?.[1];
  const accepting = exam
    ? colleges.filter((college) =>
        college.examsAccepted.some(
          (accepted) =>
            accepted.toLowerCase() === code?.toLowerCase() ||
            exam.name.toLowerCase().includes(accepted.toLowerCase()),
        ),
      )
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
