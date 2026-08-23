import Link from "next/link";
import { College } from "@/lib/mock-data";
import { Chip } from "@/components/ui/chip";
import { RatingPill } from "@/components/ui/rating";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

export function CollegeCard({ college }: { college: College }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-brand/40 hover:shadow-sm sm:flex-row sm:items-center">
      <ImagePlaceholder
        label={`${college.name} logo`}
        rounded="rounded-xl"
        className="h-14 w-14 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/college/${college.slug}`}
            className="font-display text-base font-semibold text-ink hover:text-brand"
          >
            {college.name}
          </Link>
          <Chip tone="gold">#{college.ranking.rank} {college.ranking.authority}</Chip>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {college.city}, {college.state} &middot; {college.ownership}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-ink-faint">Courses Offered</p>
            <p className="font-medium text-ink">{college.coursesOffered} courses</p>
          </div>
          <div>
            <p className="text-ink-faint">Total Fees</p>
            <p className="font-medium text-ink">{college.feesRange}</p>
          </div>
          <div>
            <p className="text-ink-faint">Exams Accepted</p>
            <p className="font-medium text-ink">{college.examsAccepted.slice(0, 2).join(", ")}</p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
        <RatingPill score={college.rating} label={`(${college.reviewCount})`} />
        <Link
          href={`/college/${college.slug}`}
          className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
