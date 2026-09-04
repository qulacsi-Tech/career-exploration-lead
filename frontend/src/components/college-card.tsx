import Link from "next/link";
import { College } from "@/lib/mock-data";
import { Chip } from "@/components/ui/chip";
import { RatingPill } from "@/components/ui/rating";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareToggle } from "@/components/compare-tray";

/**
 * A college in a listing.
 *
 * ## Why this is a container query, not a media query
 *
 * This card is used in two very different slots: full-width rows on /colleges,
 * and a three-up grid on the college and comparison pages. It previously
 * switched to its side-by-side layout at `sm:` — a *viewport* breakpoint — which
 * is the wrong measurement entirely. On a wide screen the grid cards are only
 * ~400px each, but `sm:` had long since fired, so a 56px logo, a three-column
 * stat grid and an action column were all being laid out side by side inside
 * 400px. The result was wrapped-to-death labels and the actions sitting on top
 * of the stats.
 *
 * `@container` measures the card's own width, which is the thing that actually
 * decides whether a row fits. Below `@2xl` (672px) it stacks; above it, it is
 * the row the listing page wants. One component, correct in both slots, and it
 * stays correct if either container is ever resized.
 *
 * Every text cell is `min-w-0` so long values shorten instead of forcing the
 * grid wider than its track — the other half of why the old card overflowed.
 */
export function CollegeCard({ college }: { college: College }) {
  return (
    <article className="@container rounded-2xl border border-line bg-surface transition hover:border-brand/40 hover:shadow-sm">
      <div className="flex flex-col gap-4 p-5 @2xl:flex-row @2xl:items-center">
        {/* Identity: logo and name always sit together, at every width. */}
        <div className="flex min-w-0 items-start gap-3 @2xl:flex-1">
          <ImagePlaceholder
            label={`${college.name} logo`}
            rounded="rounded-xl"
            className="h-12 w-12 shrink-0 @2xl:h-14 @2xl:w-14"
          />

          <div className="min-w-0 flex-1">
            {/* The rank chip sits with the name at every width — wrapping below
                it in a narrow card rather than being pushed out to a column
                that does not exist there. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/college/${college.slug}`}
                className="font-display text-base font-semibold text-ink hover:text-brand"
              >
                {college.name}
              </Link>
              <Chip tone="gold">
                #{college.ranking.rank} {college.ranking.authority}
              </Chip>
            </div>

            <p className="mt-1 text-sm text-ink-soft">
              {college.city}, {college.state} &middot; {college.ownership}
            </p>

            {/* Stacked only: in the row layout the rating lives in the action
                column, where there is room for it beside the button. */}
            <div className="mt-2 @2xl:hidden">
              <RatingPill score={college.rating} label={`(${college.reviewCount})`} />
            </div>
          </div>
        </div>

        {/*
          Stats. Three columns at any width — they are short values and reading
          them across is the point of a listing — but each cell is min-w-0 and
          the labels are allowed to wrap onto two lines rather than widening the
          track.
        */}
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-sm @2xl:w-80 @2xl:shrink-0 @2xl:border-0 @2xl:pt-0">
          <div className="min-w-0">
            <dt className="text-xs leading-tight text-ink-faint">Courses</dt>
            <dd className="mt-0.5 truncate font-medium text-ink">{college.coursesOffered}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs leading-tight text-ink-faint">Total fees</dt>
            <dd className="mt-0.5 truncate font-medium text-ink">{college.feesRange}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs leading-tight text-ink-faint">Exams</dt>
            <dd className="mt-0.5 truncate font-medium text-ink">
              {college.examsAccepted.slice(0, 2).join(", ")}
            </dd>
          </div>
        </dl>

        {/*
          Actions. A full-width row along the bottom when stacked — which is
          where a card's primary action belongs and, more to the point, is space
          nothing else is competing for.
        */}
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3 @2xl:w-44 @2xl:shrink-0 @2xl:flex-col @2xl:items-end @2xl:border-0 @2xl:pt-0">
          <div className="hidden @2xl:block">
            <RatingPill score={college.rating} label={`(${college.reviewCount})`} />
          </div>

          <CompareToggle slug={college.slug} className="@2xl:order-last" />

          <Link
            href={`/college/${college.slug}`}
            className="shrink-0 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
