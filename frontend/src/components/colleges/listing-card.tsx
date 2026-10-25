import Link from "next/link";
import { ArrowRight, BookOpen, Download, Eye, Flame, GraduationCap, IndianRupee, MapPin, Medal, Sparkles, Star, Trophy } from "lucide-react";
import type { College } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { CompareButton } from "@/components/colleges/compare-button";
import { plural } from "@/lib/college-rules";
import { programmeTitle } from "@/lib/college-insights";

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

/** Courses and fees are left out: the Courses and Total fees tiles above already say so. Where a shortcut goes: `/college/<slug>/<section>`. The slugs are the ones in lib/college-sections.ts. */
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

export function ListingCard({ college, badges }: { college: College; badges?: CardBadges }) {
  const exams = college.examsAccepted;
  const extra = Math.max(0, exams.length - 2);
  const courses = college.courses ?? [];
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
          className="hidden w-[6.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-brand-soft to-bg-alt px-2 py-3 text-center @lg:flex"
          aria-label={rank ? `Ranked ${rank} by ${college.ranking.authority}` : "Not ranked yet"}
        >
          {rank ? (
            <>
              <Medal className="h-5 w-5 text-gold transition group-hover:-rotate-12" aria-hidden="true" />
              <span className="mt-0.5 bg-gradient-to-b from-brand to-brand-ink bg-clip-text font-display text-5xl font-extrabold leading-none tracking-tight text-transparent transition duration-300 group-hover:scale-110">
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
                  aria-label={`Rated ${college.rating.toFixed(1)} out of 5 from ${plural(college.reviewCount, "review")}`}
                >
                  <span className="inline-flex" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-gold text-gold" : "text-line"}`} />
                    ))}
                  </span>
                  <span className="font-display text-xl font-extrabold leading-none text-ink">{college.rating.toFixed(1)}</span>
                  <span className="font-normal text-ink-soft">({plural(college.reviewCount, "review")})</span>
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
            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 @md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
              <Fact
                icon={BookOpen}
                label="Courses"
                hint={courseHint(college.coursesOffered)}
                inline
                popup={
                  courses.length > 0 && (
                    <>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">Courses offered</p>
                      <ul className="max-h-60 space-y-1 overflow-y-auto">
                        {courses.map((course) => (
                          <li key={programmeTitle(course)} className="flex items-baseline justify-between gap-4 text-sm">
                            <span className="font-semibold text-ink">
                              {programmeTitle(course)}
                              {course.duration && <span className="font-normal text-ink-soft"> · {course.duration}</span>}
                            </span>
                            {course.fees && <span className="shrink-0 font-bold text-brand-ink">{course.fees}</span>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                }
              >
                <Link
                  href={`${href}/courses`}
                  aria-label={`${college.coursesOffered} ${college.coursesOffered === 1 ? "course" : "courses"}`}
                  className="bg-[linear-gradient(to_top,var(--color-gold-soft)_38%,transparent_38%)] px-1 font-display text-4xl font-extrabold leading-none text-brand transition hover:scale-110"
                >
                  {college.coursesOffered}
                </Link>
              </Fact>
              <Fact icon={IndianRupee} label="Total fees" hint="Your budget check" small>
                <span className="whitespace-nowrap">{college.feesRange || "Ask the college"}</span>
              </Fact>
              <Fact
                icon={GraduationCap}
                label="Exams accepted"
                hint="Your entry pass"
                small
                popup={
                  exams.length > 0 && (
                    <>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">Exams accepted</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {exams.map((exam) => (
                          <li key={exam} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                            {exam}
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                }
              >
                {exams.length ? (
                  <span className="block truncate">
                    {exams.slice(0, 2).join(", ")}
                    {extra > 0 && <span className="text-brand"> +{extra} more</span>}
                  </span>
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

/** A playful line under the courses figure, from how many there are. */
function courseHint(count: number): string {
  if (count >= 8) return "Loads to choose from";
  if (count >= 4) return "Plenty to pick from";
  return "A focused few";
}

/**
 * One fact tile. The number or figure is the star of it: large, in the display face and heavy, with a
 * small label above and a playful line below. `inline` puts the label and the figure on one line, for
 * a single short number such as the course count.
 */
function Fact({
  icon: Icon,
  label,
  hint,
  inline = false,
  small = false,
  popup,
  children,
}: {
  icon: typeof Star;
  label: string;
  hint?: string;
  inline?: boolean;
  /** Smaller figure text, for values that are long (a fee range, a list of exams). */
  small?: boolean;
  /** Shown in a bubble above the tile while it is hovered or focused. */
  popup?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      tabIndex={popup ? 0 : undefined}
      className="group/fact relative flex min-w-0 items-center gap-3 rounded-xl bg-bg-alt px-3.5 py-3 outline-none transition group-hover:bg-brand-soft/50"
    >
      {popup && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-max max-w-[24rem] translate-y-1 rounded-xl border border-line bg-surface p-3 opacity-0 shadow-lg transition group-hover/fact:translate-y-0 group-hover/fact:opacity-100 group-focus/fact:translate-y-0 group-focus/fact:opacity-100"
        >
          {popup}
        </div>
      )}
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-brand shadow-sm transition duration-300 group-hover:scale-105">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {inline ? (
          <div className="flex items-center gap-2.5">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</dt>
            <dd>{children}</dd>
          </div>
        ) : (
          <>
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</dt>
            <dd className={`mt-0.5 font-display font-extrabold leading-tight text-ink ${small ? "text-lg" : "text-xl"}`}>{children}</dd>
          </>
        )}
        {hint && <p className="mt-0.5 text-xs italic text-brand-ink/70">{hint}</p>}
      </div>
    </div>
  );
}
