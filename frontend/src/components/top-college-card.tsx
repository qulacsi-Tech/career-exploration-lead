import Link from "next/link";
import { College } from "@/lib/mock-data";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CardBand, BandAction } from "@/components/ui/card-band";

export function TopCollegeCard({ college }: { college: College }) {
  const featured = college.courses[0];

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand/40 hover:shadow-sm">
      <div className="flex flex-1 items-start gap-4 p-4">
        <ImagePlaceholder
          label={`${college.name} campus photo`}
          rounded="rounded-md"
          className="h-[72px] w-24 shrink-0"
        />
        <div className="min-w-0">
          <Link
            href={`/college/${college.slug}`}
            className="font-display text-sm font-bold leading-snug text-ink hover:text-brand"
          >
            {college.name}
          </Link>
          <p className="mt-1.5 flex items-center gap-1 text-sm text-ink-soft">
            <PinIcon className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">
              {college.city}, {college.state}
            </span>
          </p>
        </div>
      </div>

      <CardBand>
        <div className="min-w-0">
          <p className="text-sm font-bold text-band-ink">{featured.name}</p>
          <p className="truncate text-xs text-band-ink-soft">{featured.fees}</p>
        </div>
        <BandAction href={`/college/${college.slug}`}>Courses &amp; fees</BandAction>
      </CardBand>
    </article>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 18s6-5.2 6-9.8A6 6 0 0 0 4 8.2C4 12.8 10 18 10 18Zm0-7.8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
