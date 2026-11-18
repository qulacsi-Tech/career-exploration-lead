import type { Metadata } from "next";
import { ExamDetail } from "@/components/exams/exam-detail";
import { getExam, getExamSlugs } from "@/lib/api";
import { examHref, examKey } from "@/lib/entity-url";
import { findByKey, resolveByKey } from "@/lib/entity-resolve";

export async function generateStaticParams() {
  try {
    const slugs = await getExamSlugs();
    return slugs.map((slug) => ({ slug }));
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
  try {
    const exam = await findByKey(key, getExam);
    if (!exam) return { title: "Exam not found" };
    return {
      title: `${exam.name}: Dates, Registration, Pattern & Cutoffs`,
      description: exam.description,
      alternates: { canonical: `/exams/${examKey(exam)}` },
    };
  } catch {
    return { title: "Exam not found" };
  }
}

/** An exam's page. The body is shared with its Community tab (./community); see components/exams/exam-detail. */
export default async function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: key } = await params;
  // A missing record is a 404; an older address (no id, a stale slug) goes to the current one.
  const exam = await resolveByKey(key, getExam, examHref);
  return <ExamDetail exam={exam} />;
}
