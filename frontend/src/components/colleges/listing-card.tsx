import Link from "next/link";
import { Cog, Download, Heart } from "lucide-react";
import type { College } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareButton } from "@/components/colleges/compare-button";

/**
 * A row on the /colleges listing: logo, identity, a corner rank badge, three
 * stats, and Compare / Brochure actions. Distinct from CollegeCard, which also
 * serves the narrower grids on the college and comparison pages.
 */
export type CardBadges = { featured: boolean; topRated: boolean; mostViewed: boolean };

export function ListingCard({ college, badges }: { college: College; badges?: CardBadges }) {
  const exams = college.examsAccepted;
  const extra = Math.max(0, exams.length - 2);
  const href = `/college/${college.slug}`;

  return (
    <article className="@container relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_24px_-12px_rgba(177,36,62,0.35)]">
      {college.ranking?.rank ? (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          #{college.ranking.rank} {college.ranking.authority}
        </span>
      ) : null}

      <div className="p-5">
        <div className="flex items-start gap-4 pr-24 @2xl:pr-28">
          {college.logo || college.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(college.logo || college.image || "")}
              alt={`${college.name} logo`}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-xl border border-line bg-white object-cover @2xl:h-16 @2xl:w-16"
            />
          ) : (
            <ImagePlaceholder
              label={`${college.name} logo`}
              rounded="rounded-xl"
              className="h-14 w-14 shrink-0 @2xl:h-16 @2xl:w-16"
            />
          )}
          <div className="min-w-0">
            <Link
              href={href}
              className="font-display text-base font-semibold leading-snug text-ink hover:text-brand @2xl:text-lg"
            >
              {college.name}
            </Link>
            {badges && (badges.featured || badges.topRated || badges.mostViewed) && (
              <span className="ml-2 inline-flex translate-y-0.5 items-center gap-1 align-middle">
                {badges.featured && <Cog aria-label="Featured" className="h-4 w-4 text-amber-500"><title>Featured</title></Cog>}
                {badges.topRated && <Cog aria-label="Top rated" className="h-4 w-4 text-brand"><title>Top rated</title></Cog>}
                {badges.mostViewed && <Cog aria-label="Most viewed" className="h-4 w-4 text-emerald-600"><title>Most viewed</title></Cog>}
              </span>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span>{college.city}</span>
              <span>{college.ownership}</span>
              <span className="inline-flex items-center gap-1 font-medium text-ink">
                <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
                {college.rating.toFixed(1)}
                <span className="font-normal text-ink-faint">({college.reviewCount})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
          <dl className="grid grid-cols-3 gap-x-6 text-sm @2xl:flex @2xl:gap-x-10">
            <Stat label="Courses Offered">
              <Link href={`${href}#courses`} className="font-medium text-brand hover:underline">
                {college.coursesOffered} {college.coursesOffered === 1 ? "course" : "courses"}
              </Link>
            </Stat>
            <Stat label="Total Fees">{college.feesRange || "—"}</Stat>
            <Stat label="Exams Accepted">
              {exams.length ? (
                <>
                  {exams.slice(0, 2).join(", ")}
                  {extra > 0 && <span className="font-medium text-brand">, +{extra}</span>}
                </>
              ) : (
                "—"
              )}
            </Stat>
          </dl>

          <div className="flex shrink-0 items-center gap-2">
            <CompareButton slug={college.slug} name={college.name} />
            <Link
              href={college.brochureUrl || "/enquiry"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <Download className="h-4 w-4" />
              Brochure
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-1 truncate font-medium text-ink">{children}</dd>
    </div>
  );
}
