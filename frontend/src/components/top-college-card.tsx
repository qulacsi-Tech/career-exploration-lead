import Link from "next/link";
import Image from "next/image";
import { College } from "@/lib/mock-data";
import { GraduationCap, Tag } from "lucide-react";

const collegeImages: Record<string, string> = {
  "bengaluru-institute-of-management-studies":
    "/images/colleges/bengaluru-institute-of-management-studies.jpg",
  "horizon-school-of-business": "/images/colleges/horizon-school-of-business.svg",
  "eastwind-institute-of-management": "/images/colleges/eastwind-institute-of-management.svg",
};

/**
 * Travel-card format: a portrait tile whose photo grows on hover.
 *
 * At rest the photo occupies the top 228px and the name, location and course
 * sit on paper below it. On hover the photo expands to the full inset of the card —
 * ~90% of its height — and the text stays exactly where it is, so the picture
 * rises *behind* the copy rather than pushing it. A scrim fades in underneath
 * at the same time and the type inverts to white, which is what keeps it
 * readable once the photo has arrived.
 *
 * Nothing moves on the text itself: growing the image and recolouring type is
 * cheap, whereas animating the layout would reflow the whole grid row.
 *
 * `focus-within` mirrors every hover state — the card is reachable by keyboard
 * through its two links, and the hover-only version left those users reading
 * dark type over a photograph.
 */
export function TopCollegeCard({ college }: { college: College }) {
  const featured = college.courses[0];
  const imgSrc =
    collegeImages[college.slug] ||
    "/images/colleges/bengaluru-institute-of-management-studies.jpg";

  return (
    <article className="group relative flex h-[440px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-surface/70 p-3 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-xl focus-within:shadow-xl">
      {/* The photo: 228px at rest, the whole card inset on hover */}
      <div className="absolute inset-x-3 top-3 h-[228px] overflow-hidden rounded-[22px] bg-bg-alt transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-[calc(100%-1.5rem)] group-focus-within:h-[calc(100%-1.5rem)]">
        <Image
          src={imgSrc}
          alt={`${college.name} campus photo`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105 group-focus-within:scale-105"
        />
        {/* Legibility scrim, only needed once the photo is behind the copy */}
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
          href={`/college/${college.slug}`}
          className="line-clamp-2 font-display text-lg font-bold leading-snug text-ink transition-colors duration-500 group-hover:text-white group-focus-within:text-white"
        >
          {college.name}
        </Link>

        <p className="mt-1 truncate text-sm text-ink-soft transition-colors duration-500 group-hover:text-white/70 group-focus-within:text-white/70">
          {college.city}, {college.state}
        </p>

        <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="sr-only">Featured course</dt>
            <GraduationCap className="h-4 w-4 shrink-0 text-brand" />
            <dd className="truncate font-semibold text-ink transition-colors duration-500 group-hover:text-white group-focus-within:text-white">
              {featured.name}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Fees</dt>
            <Tag className="h-4 w-4 shrink-0 text-brand" />
            <dd className="text-ink-soft transition-colors duration-500 group-hover:text-white/80 group-focus-within:text-white/80">
              {featured.fees}
            </dd>
          </div>
        </dl>

        <Link
          href={`/college/${college.slug}`}
          className="mt-auto block rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white transition-colors duration-500 hover:bg-brand group-hover:bg-white group-hover:text-ink group-hover:hover:bg-brand group-hover:hover:text-white group-focus-within:bg-white group-focus-within:text-ink"
        >
          Courses &amp; fees
        </Link>
      </div>
    </article>
  );
}
