import Link from "next/link";
import Image from "next/image";
import { Exam } from "@/lib/mock-data";
import { KeyRound, Target } from "lucide-react";

/**
 * Same travel-card format as TopCollegeCard: the photo occupies the top 228px
 * at rest and grows to the card's full inset on hover, rising behind copy that
 * does not move, with a scrim and inverted type keeping it readable.
 *
 * The cutoff and answer-key shortcuts stay as their own links rather than being
 * folded into the card — they are the two things a candidate most often wants
 * without opening the exam page first.
 */
export function TopExamCard({ exam }: { exam: Exam }) {
  return (
    <article className="group relative flex h-[440px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-surface/70 p-3 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-xl focus-within:shadow-xl">
      {/* The photo: 228px at rest, the whole card inset on hover */}
      <div className="absolute inset-x-3 top-3 h-[228px] overflow-hidden rounded-[22px] bg-bg-alt transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-[calc(100%-1.5rem)] group-focus-within:h-[calc(100%-1.5rem)]">
        <Image
          src={`/images/exams/${exam.slug}.jpg`}
          alt={`${exam.name} exam`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105 group-focus-within:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100" />
      </div>

      {/* Reserves the photo's footprint in flow. The photo is absolute so it
          can grow on hover without reflowing the card, which means the copy
          needs space kept for it — without this the block sat under the photo
          and a two-line name ran up into the picture. Both are pixels, not
          percentages: a percentage on the absolute photo resolves against the
          padding box and one here resolves against the content box, so the two
          drift apart by the padding and close the gap under the image. */}
      <div aria-hidden className="h-[228px] shrink-0" />

      {/* Copy block: the photo grows behind it, so nothing here moves */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-2 pt-4">
        <Link
          href={`/exams/${exam.slug}`}
          className="line-clamp-2 font-display text-lg font-bold leading-snug text-ink transition-colors duration-500 group-hover:text-white group-focus-within:text-white"
        >
          {exam.name}
        </Link>

        <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-soft transition-colors duration-500 group-hover:text-white/70 group-focus-within:text-white/70">
          {exam.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <Link
            href={`/exams/${exam.slug}/cutoff`}
            className="flex items-center gap-1.5 font-semibold text-ink transition-colors duration-500 hover:text-brand group-hover:text-white group-hover:hover:text-brand group-focus-within:text-white"
          >
            <Target className="h-4 w-4 shrink-0 text-brand" />
            Cutoff
          </Link>
          <Link
            href={`/exams/${exam.slug}/answer-key`}
            className="flex items-center gap-1.5 font-semibold text-ink transition-colors duration-500 hover:text-brand group-hover:text-white group-hover:hover:text-brand group-focus-within:text-white"
          >
            <KeyRound className="h-4 w-4 shrink-0 text-brand" />
            Answer key
          </Link>
        </div>

        <Link
          href={`/exams/${exam.slug}`}
          className="mt-auto block rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white transition-colors duration-500 hover:bg-brand group-hover:bg-white group-hover:text-ink group-hover:hover:bg-brand group-hover:hover:text-white group-focus-within:bg-white group-focus-within:text-ink"
        >
          Read more
        </Link>
      </div>
    </article>
  );
}
