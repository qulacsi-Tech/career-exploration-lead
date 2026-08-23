import Link from "next/link";
import { RecommendedProgram } from "@/lib/mock-data";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

export function RecommendedProgramCard({ program }: { program: RecommendedProgram }) {
  return (
    <article className="flex flex-col rounded-xl bg-surface p-4">
      <ImagePlaceholder
        label={`${program.university} campus`}
        rounded="rounded-lg"
        className="aspect-[16/9] w-full"
      />

      <div className="mt-5 text-center">
        <Link
          href={`/courses/${program.slug}`}
          className="font-display text-lg font-semibold text-ink hover:text-brand"
        >
          {program.name}
        </Link>
        <div className="mt-3">
          <Link
            href={`/college/${program.universitySlug}`}
            className="inline-block rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
          >
            {program.university}
          </Link>
        </div>
      </div>

      <dl className="mt-6 grid flex-1 grid-cols-2 gap-x-4 gap-y-5 text-sm">
        <div>
          <dt className="font-bold text-ink">Duration</dt>
          <dd className="mt-1 text-ink-soft">
            <span className="block text-ink-faint">Online:</span>
            {program.online.duration}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-ink">Fees</dt>
          <dd className="mt-1 text-ink-soft">
            <span className="block text-ink-faint">Online:</span>
            {program.online.fees}
            <span className="block">{program.online.feesNote}</span>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-ink">On-campus:</dt>
          <dd className="mt-1 text-ink-soft">{program.onCampus.duration}</dd>
        </div>
        <div>
          <dt className="font-bold text-ink">On-campus:</dt>
          <dd className="mt-1 text-ink-soft">{program.onCampus.fees}</dd>
        </div>
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href={`/courses/${program.slug}/eligibility`}
          className="rounded-md border border-brand px-3 py-2 text-center text-xs font-medium text-brand transition hover:bg-brand-soft"
        >
          Check Eligibility
        </Link>
        <Link
          href={`/courses/${program.slug}`}
          className="rounded-md bg-brand px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand-dark"
        >
          Know More
        </Link>
      </div>
    </article>
  );
}
