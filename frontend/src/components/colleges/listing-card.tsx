import Link from "next/link";
import { ArrowRight, BookOpen, Download, Eye, Flame, GraduationCap, IndianRupee, MapPin, Medal, Sparkles, Star, Trophy } from "lucide-react";
import type { College } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareButton } from "@/components/colleges/compare-button";

/**
 * A row on the /colleges listing, in the Shiksha mould the client asked for: the rank up front, a
 * logo, a name you can actually read, labelled facts, a row of shortcuts into the college's pages, and
 * Compare / Brochure stacked on the right. Distinct from CollegeCard, which also serves the narrower
 * grids on the college and comparison pages.
 *
 * The motion is all CSS (`group-hover`), so the card stays a server component. The scroll-in
 * animation is added by the page, which wraps each card in `Reveal`.
 */
export type CardBadges = { featured: boolean; topRated: boolean; mostViewed: boolean };

/** Where a shortcut goes: `/college/<slug>/<section>`. The slugs are the ones in lib/college-sections.ts. */
const SHORTCUTS = [
  { label: "Admissions", section: "admission-process" },
  { label: "Courses", section: "courses" },
  { label: "Fees", section: "fees" },
  { label: "Placements", section: "placements" },
  { label: "Cut-offs", section: "cutoffs" },
] as const;

/** One friendly line about the college, chosen from what we already know about it. */
function vibe(college: College, badges?: CardBadges): string {
  const rank = college.ranking?.rank;
  if (rank && rank <= 3) return "A heavyweight on the ranking board.";
  if (rank && rank <= 10) return "Sitting pretty in the top ten.";
  if (college.rating >= 4.5 && college.reviewCount >= 100) return "Students are rather fond of this one.";
  if (badges?.mostViewed) return "Everyone seems to be peeking at this one.";
  if (badges?.featured) return "Hand-picked by our team.";
  if (college.coursesOffered >= 8) return "So many courses, so little time.";
  return "Worth a closer look.";
}

function Pill({ icon: Icon, tone, children }: { icon: typeof Star; tone: "gold" | "brand" | "green"; children: React.ReactNode }) {
  const styles = {
    gold: "bg-gold-soft text-gold",
    brand: "bg-brand-soft text-brand-ink",
    green: "bg-emerald-50 text-emerald-700",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ListingCard({ college, badges }: { college: College; badges?: CardBadges }) {
  const exams = college.examsAccepted;
  const extra = Math.max(0, exams.length - 2);
  const href = `/college/${college.slug}`;
  const rank = college.ranking?.rank;
  const stars = Math.round(college.rating);

  return (
    <article className="@container group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_-14px_rgba(177,36,62,0.4)]">
      {/* A bar down the left edge that grows to full height when the card is pointed at. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-top scale-y-[0.35] bg-brand transition duration-300 group-hover:scale-y-100"
      />

      {/* On a narrow screen the rank is a corner tag; the big block below takes over from @lg. */}
      <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-ink px-3 py-1 text-xs font-bold tracking-wide text-white @lg:hidden">
        {rank ? `#${rank} ${college.ranking.authority}` : "Unranked"}
      </span>

      <div className="flex gap-4 p-5 pl-6 @2xl:gap-5">
        <div
          className="hidden w-[5.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 text-center @lg:flex"
          aria-label={rank ? `Ranked ${rank} by ${college.ranking.authority}` : "Not ranked yet"}
        >
          {rank ? (
            <>
              <Medal className="h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
              <span className="mt-0.5 font-display text-4xl font-extrabold leading-none text-brand-ink transition duration-300 group-hover:scale-110">
                {rank}
              </span>
              <span className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">{college.ranking.authority}</span>
            </>
          ) : (
            <>
              <Trophy className="h-6 w-6 text-ink-faint" aria-hidden="true" />
              <span className="mt-1 text-xs font-semibold leading-tight text-ink-soft">Unranked yet</span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            {college.logo || college.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(college.logo || college.image || "")}
                alt={`${college.name} logo`}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-cover transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105 @2xl:h-[4.5rem] @2xl:w-[4.5rem]"
              />
            ) : (
              <ImagePlaceholder
                label={`${college.name} logo`}
                rounded="rounded-xl"
                className="h-16 w-16 shrink-0 @2xl:h-[4.5rem] @2xl:w-[4.5rem]"
              />
            )}

            <div className="min-w-0 pr-16 @lg:pr-0">
              <Link
                href={href}
                className="font-display text-lg font-bold leading-snug text-ink transition hover:text-brand @2xl:text-xl"
              >
                {college.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm italic text-brand-ink/80">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                {vibe(college, badges)}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink">
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
                  {college.city}
                </span>
                <span className="rounded-full border border-line bg-bg-alt px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                  {college.ownership}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 font-semibold"
                  aria-label={`Rated ${college.rating.toFixed(1)} out of 5 from ${college.reviewCount} reviews`}
                >
                  <span className="inline-flex" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-gold text-gold" : "text-line"}`} />
                    ))}
                  </span>
                  {college.rating.toFixed(1)}
                  <span className="font-normal text-ink-soft">({college.reviewCount} reviews)</span>
                </span>
              </div>

              {badges && (badges.featured || badges.topRated || badges.mostViewed) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {badges.featured && <Pill icon={Sparkles} tone="gold">Featured</Pill>}
                  {badges.topRated && <Pill icon={Flame} tone="brand">Top rated</Pill>}
                  {badges.mostViewed && <Pill icon={Eye} tone="green">Most viewed</Pill>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 @2xl:flex-row @2xl:items-stretch @2xl:justify-between">
            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 @md:grid-cols-3">
              <Fact icon={BookOpen} label="Courses to explore">
                <Link href={`${href}/courses`} className="font-semibold text-brand hover:underline">
                  {college.coursesOffered} {college.coursesOffered === 1 ? "course" : "courses"}
                </Link>
              </Fact>
              <Fact icon={IndianRupee} label="Total fees">
                {college.feesRange || "Ask the college"}
              </Fact>
              <Fact icon={GraduationCap} label="Exams accepted">
                {exams.length ? (
                  <>
                    {exams.slice(0, 2).join(", ")}
                    {extra > 0 && <span className="font-semibold text-brand"> +{extra} more</span>}
                  </>
                ) : (
                  "Not listed yet"
                )}
              </Fact>
            </dl>

            <div className="flex shrink-0 gap-2 @2xl:w-40 @2xl:flex-col">
              <div className="flex-1">
                <CompareButton slug={college.slug} name={college.name} block />
              </div>
              <Link
                href={college.brochureUrl || "/enquiry"}
                data-track="cta_brochure"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Brochure
              </Link>
            </div>
          </div>

          <nav aria-label={`More about ${college.name}`} className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-line-soft pt-3 text-sm">
            <span className="mr-1 text-ink-faint">Peek inside:</span>
            {SHORTCUTS.map((s, i) => (
              <span key={s.section} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden="true" className="text-line">&middot;</span>}
                <Link
                  href={`${href}/${s.section}`}
                  className="group/link inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium text-brand-ink transition hover:bg-brand-soft hover:text-brand"
                >
                  {s.label}
                  <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden="true" />
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </article>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Star; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-bg-alt px-3 py-2.5 transition group-hover:bg-brand-soft/50">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-brand shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold leading-snug text-ink">{children}</dd>
      </div>
    </div>
  );
}
