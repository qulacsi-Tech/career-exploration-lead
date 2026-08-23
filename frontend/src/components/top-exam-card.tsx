import Link from "next/link";
import { Exam } from "@/lib/mock-data";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CardBand, BandAction } from "@/components/ui/card-band";

export function TopExamCard({ exam }: { exam: Exam }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand/40 hover:shadow-sm">
      <div className="flex flex-1 items-start gap-4 p-4">
        <ImagePlaceholder label={`${exam.name} exam`} rounded="rounded-md" className="h-[72px] w-24 shrink-0" />
        <div className="min-w-0">
          <Link
            href={`/exams/${exam.slug}`}
            className="font-display text-sm font-bold leading-snug text-band-ink hover:text-brand"
          >
            {exam.name}
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-soft">{exam.description}</p>
        </div>
      </div>

      <CardBand>
        <div className="flex min-w-0 items-center gap-5 text-sm font-bold text-band-ink">
          <Link href={`/exams/${exam.slug}/cutoff`} className="hover:underline">
            Cutoff
          </Link>
          <Link href={`/exams/${exam.slug}/answer-key`} className="hover:underline">
            Answer key
          </Link>
        </div>
        <BandAction href={`/exams/${exam.slug}`}>Read More</BandAction>
      </CardBand>
    </article>
  );
}
