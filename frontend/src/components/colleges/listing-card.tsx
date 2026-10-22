import Link from "next/link";
import { ArrowRight, BookOpen, Download, Eye, Feather, Flame, GraduationCap, IndianRupee, MapPin, Medal, Sparkles, Star, TrendingUp, Trophy } from "lucide-react";
import type { College } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareButton } from "@/components/colleges/compare-button";

/**
 * A row on the /colleges listing. The layout follows the client's reference: a tinted rank column
 * down the left edge, then the college's identity with Compare and Brochure stacked beside it, a row
 * of fact tiles, the four student ratings as rings, and a shortcut row along the bottom. Each part
 * only appears when there is something to show, so a college with no reviews or no placement record
 * gets a shorter card and not a card with holes in it.
 *
 * The motion is CSS (`group-hover`, and a ring that draws itself once), so the card stays a server
 * component. The scroll-in is added by the page, which wraps each card in `Reveal`.
 */
export type CardBadges = { featured: boolean; topRated: boolean; mostViewed: boolean };

/**
 * Shortcuts into the college's own pages. Courses and Fees are left out on purpose: the card already
 * shows both, and the courses figure links to the Courses page.
 */
const SHORTCUTS = [
  { label: "Admissions", section: "admission-process" },
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

/**
 * A rating as a ring that fills in proportion to the score out of 5, with the number in the middle.
 * `pathLength=100` lets the dash be written as a plain percentage.
 */
function RatingRing({ score, label }: { score: number; label: string }) {
  const filled = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <div className="flex items-center gap-2.5" title={`${label}: ${score.toFixed(1)} out of 5`}>
      <span className="relative grid h-12 w-12 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" pathLength="100" className="stroke-line" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength="100"
            className="tcp-ring stroke-brand"
            style={{ strokeDasharray: `${filled} 100` }}
          />
        </svg>
        <span className="relative font-display text-sm font-extrabold text-ink">{score.toFixed(1)}</span>
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}

export function ListingCard({ college, badges }: { college: College; badges?: CardBadges }) {
  const exams = college.examsAccepted;
  const extra = Math.max(0, exams.length - 2);
  const href = `/college/${college.slug}`;
  const rank = college.ranking?.rank;
  const stars = Math.round(college.rating);
  const ratings = college.studentRatings ?? [];

  return (
    <article className="@container group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_14px_32px_-14px_rgba(177,36,62,0.4)]">
      {/* On a narrow screen the rank is a corner tag; the full-height column below takes over from @lg. */}
      <span className="absolute right-0 top-0 z-10 rounded-bl-xl bg-brand-ink px-3 py-1 text-xs font-bold tracking-wide text-white @lg:hidden">
        {rank ? `#${rank} ${college.ranking.authority}` : "Unranked"}
      </span>

      <div className="flex">
        <div
          className="hidden w-[6.5rem] shrink-0 flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-4 text-center @lg:flex"
          aria-label={rank ? `Ranked ${rank} by ${college.ranking.authority}` : "Not ranked yet"}
        >
          {rank ? (
            <>
              <Medal className="h-6 w-6 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
              <span className="font-display text-5xl font-extrabold leading-none text-brand-ink transition duration-300 group-hover:scale-110">
                {rank}
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-brand">{college.ranking.authority}</span>
              <span className="text-xs text-ink-soft">{college.stream}</span>
            </>
          ) : (
            <>
              <Trophy className="h-7 w-7 text-ink-faint" aria-hidden="true" />
              <span className="mt-1 text-xs font-semibold leading-tight text-ink-soft">Unranked yet</span>
              <span className="text-xs text-ink-faint">{college.stream}</span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-start @2xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {college.logo || college.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(college.logo || college.image || "")}
                  alt={`${college.name} logo`}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-xl border border-line bg-bg-alt object-cover transition duration-300 group-hover:rotate-[-3deg] group-hover:scale-105 @2xl:h-[4.5rem] @2xl:w-[4.5rem]"
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
                  <Feather className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
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
                  {college.foundedYear ? <span className="text-ink-soft">Est. {college.foundedYear}</span> : null}
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

          {/* As many tiles as there is something to show: the average package needs a placement record. */}
          <dl className="mt-5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))]">
            <Fact icon={BookOpen} label="Courses">
              <Link href={`${href}/courses`} className="font-bold text-brand hover:underline">
                {college.coursesOffered} {college.coursesOffered === 1 ? "course" : "courses"}
              </Link>
            </Fact>
            <Fact icon={IndianRupee} label="Total fees">
              {college.feesRange || "Ask the college"}
            </Fact>
            {college.avgPackage ? (
              <Fact icon={TrendingUp} label={`Avg package${college.avgPackageYear ? ` · ${college.avgPackageYear}` : ""}`}>
                {college.avgPackage}
              </Fact>
            ) : null}
            <Fact icon={GraduationCap} label="Exams accepted">
              {exams.length ? (
                <>
                  {exams.slice(0, 2).join(", ")}
                  {extra > 0 && <span className="font-bold text-brand"> +{extra} more</span>}
                </>
              ) : (
                "Not listed yet"
              )}
            </Fact>
          </dl>

          {ratings.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="w-full text-xs font-bold uppercase tracking-wider text-ink-faint @md:w-auto">Student ratings</p>
              {ratings.map((r) => (
                <RatingRing key={r.label} score={r.score} label={r.label} />
              ))}
            </div>
          )}

          <nav
            aria-label={`More about ${college.name}`}
            className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line-soft pt-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
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
            </div>
            <Link href={href} className="inline-flex items-center gap-1 font-bold text-brand transition hover:gap-2 hover:underline">
              View full overview <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
