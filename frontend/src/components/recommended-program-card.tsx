import Link from "next/link";
import Image from "next/image";
import { RecommendedProgram } from "@/lib/mock-data";

/**
 * Compact on phones, roomier from `sm` up. On a narrow screen the card is the
 * full column width, so a 16:9 image alone ate most of the viewport and pushed
 * the fees and the two actions below the fold — the parts that actually drive a
 * lead. The image is cropped shallower there and the vertical rhythm tightens.
 */
export function RecommendedProgramCard({ program }: { program: RecommendedProgram }) {
  return (
    <article className="group flex flex-col rounded-xl bg-surface p-3 shadow-sm transition hover:shadow-md sm:p-4">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border border-line bg-bg-alt sm:aspect-[16/9]">
        <Image
          src={`/images/programs/${program.slug}.svg`}
          alt={`${program.name} program visual`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="mt-3 text-center sm:mt-5">
        <Link
          href={`/courses/${program.slug}`}
          className="font-display text-base font-semibold text-ink hover:text-brand sm:text-lg"
        >
          {program.name}
        </Link>
        <div className="mt-2 sm:mt-3">
          <Link
            href={`/college/${program.universitySlug}`}
            className="inline-block rounded-md border border-line px-3 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand sm:py-1.5"
          >
            {program.university}
          </Link>
        </div>
      </div>

      {/*
        Two cells rather than four. Duration and Fees each carry both modes as
        their own lines, so "On-campus" is written once per column instead of
        being repeated as a second pair of headings — same information, close to
        half the height.
      */}
      <dl className="mt-4 grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-xs sm:mt-6 sm:text-sm">
        <div>
          <dt className="font-bold text-ink">Duration</dt>
          <dd className="mt-1 space-y-1 text-ink-soft">
            <p>
              <span className="text-ink-faint">Online:</span> {program.online.duration}
            </p>
            <p>
              <span className="text-ink-faint">On-campus:</span> {program.onCampus.duration}
            </p>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-ink">Fees</dt>
          <dd className="mt-1 space-y-1 text-ink-soft">
            <p>
              <span className="text-ink-faint">Online:</span> {program.online.fees}{" "}
              <span className="text-ink-faint">{program.online.feesNote}</span>
            </p>
            <p>
              <span className="text-ink-faint">On-campus:</span> {program.onCampus.fees}
            </p>
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
        <Link
          href={`/courses/${program.slug}/eligibility`}
          className="rounded-md border border-brand px-2 py-2 text-center text-xs font-medium text-brand transition hover:bg-brand-soft sm:px-3"
        >
          Check Eligibility
        </Link>
        <Link
          href={`/courses/${program.slug}`}
          className="rounded-md bg-brand px-2 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-dark sm:px-3"
        >
          Know More
        </Link>
      </div>
    </article>
  );
}
