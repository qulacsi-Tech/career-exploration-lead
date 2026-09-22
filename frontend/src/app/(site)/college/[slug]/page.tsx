import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CollegeCard } from "@/components/college-card";
import { Chip } from "@/components/ui/chip";
import { ArrowRight, Briefcase, Star, TrendingUp, Trophy } from "lucide-react";
import { QuoteParallax } from "@/components/college/quote-parallax";
import { StoryBackdrop } from "@/components/college/story-backdrop";
import { FactMosaic, type FactItem } from "@/components/college/fact-mosaic";
import { Reveal, RevealGroup, RevealItem } from "@/components/college/reveal";
import { collegePhoto } from "@/lib/college-images";
import { colleges } from "@/lib/mock-data";
import { alertsFor } from "@/lib/college-content";
import { ComparisonTable } from "@/components/comparison-table";
import { sectionHref, sectionsFor } from "@/lib/college-sections";
import {
  comparisonsFeaturing,
  similarColleges,
  compareUrl,
} from "@/lib/comparison-data";

/**
 * The college overview — what this institution is, and where to go next.
 *
 * ## It used to be the whole college
 *
 * Every section (Courses & Fees, Cutoffs, Placements, Scholarships, Hostel,
 * Campus, Videos, Reviews, Articles) now lives at its own URL under
 * `/college/<slug>/…`, per the 15 Sep feedback. This page is act one only: the
 * alerts, the about copy, the fact bento, the conversion sidebar, and the
 * comparison tail a visitor reaches once they have decided.
 *
 * The hero and the tab rail are in `layout.tsx`, so they persist across every
 * section rather than re-mounting per tab.
 *
 * ## What stayed on this page and why
 *
 * The **comparison tail** — peers, curated verdicts, similar colleges. It is
 * not a section of the college; it is the answer to "is this the right one",
 * which is the question the overview exists to serve. Putting it behind its own
 * tab would hide it from exactly the visitors who have not yet decided.
 *
 * The **pull quote** likewise: one student's words belong under the
 * introduction, not filed away in Reviews with the other twelve.
 *
 * ## What deliberately did not change
 *
 * - **Still a server component.** Motion and interaction live in leaf client
 *   components under `components/college/`; the data, the metadata and the
 *   content render on the server.
 * - **Reduced motion gets the finished page**, not a faster animation. Each
 *   primitive renders its resting state when the preference is set — including
 *   the backdrop, which keeps its shapes and drops only the drift.
 */

export function generateStaticParams() {
  return colleges.map((c) => ({ slug: c.slug }));
}

function getCollege(slug: string) {
  return colleges.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) return { title: "College not found" };
  return {
    title: `${college.name}: Courses, Fees, Placements & Reviews`,
    description: college.about,
    alternates: { canonical: `/college/${college.slug}` },
  };
}

/** Section heading, used by every section here so the rhythm is one rule. */
function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <Reveal>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {lede && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{lede}</p>}
    </Reveal>
  );
}

export default async function CollegeOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) notFound();

  const related = colleges.filter((c) => c.slug !== college.slug).slice(0, 3);

  /**
   * Comparison, at the bottom of the page and not on the homepage (MOM §1.6).
   *
   * `peers` are same-program colleges nearest by rank, so the inline table
   * compares like with like rather than whatever happens to be next in the
   * directory. `curatedPairs` are the hand-written pages this college appears
   * in — the versions with an actual verdict.
   */
  const peers = similarColleges(college, 2);
  const curatedPairs = comparisonsFeaturing(college.slug);

  const alerts = [...alertsFor(college.slug)].sort(
    (a, b) => Number(b.isUrgent) - Number(a.isUrgent),
  );

  /**
   * The pull quote: the best-rated review, longest first among ties.
   *
   * Longest as the tiebreak because a two-line review set at 40px is a quote
   * with nothing in it — the band needs a sentence that carries the weight of
   * the treatment. A college with no reviews simply gets no quote band.
   */
  const featuredReview = [...college.reviews].sort(
    (a, b) => b.rating - a.rating || b.body.length - a.body.length,
  )[0];

  /**
   * The Overview bento.
   *
   * These were the sidebar's "Quick Facts" definition list, which a visitor's
   * eye slid past on the way to the callback form. As the second half of the
   * Overview they are the thing being read: the paragraph says what the college
   * is, the tiles say what it is made of.
   *
   * The age is derived at build time. These pages are statically generated, so
   * the figure is as fresh as the last deploy — which for a number that moves
   * once a year is the right trade against making the page dynamic.
   */
  const yearsRunning = new Date().getFullYear() - college.established;
  const facts: FactItem[] = [
    {
      icon: "calendar",
      label: "Established",
      value: college.established,
      note: `${yearsRunning} years of teaching on this campus.`,
    },
    {
      icon: "building",
      label: "Ownership",
      value: college.ownership,
      note: `A ${college.ownership.toLowerCase()} institution, strongest in ${college.stream.toLowerCase()}.`,
    },
    {
      icon: "book",
      label: "Programmes offered",
      value: college.coursesOffered,
      note: "Degrees across undergraduate and postgraduate levels.",
      accent: true,
    },
    {
      icon: "wallet",
      label: "Total fees",
      value: college.feesRange,
      note: "Full programme cost, lowest to highest course.",
    },
    {
      icon: "award",
      label: "Accreditations",
      value: `${college.approvals.length} bodies`,
      note: "Recognised and approved by:",
      chips: college.approvals,
    },
  ];

  /* The sections this college has, minus the overview itself — the onward
     links below the introduction. Same list the rail reads, so a college with
     no videos gets no Videos card here either. */
  const onward = sectionsFor(college).filter((section) => section.slug !== "");

  return (
    <div>
      {alerts.length > 0 && (
        <div className="border-b border-line bg-bg-alt">
          <RevealGroup
            as="ul"
            className="mx-auto max-w-7xl space-y-2 px-4 py-6 sm:px-6 lg:px-8"
            stagger={0.06}
          >
            {alerts.map((alert) => (
              <RevealItem
                key={alert.id}
                as="li"
                className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
                  alert.isUrgent
                    ? "border-brand/40 bg-brand-soft text-brand-ink"
                    : "border-line bg-surface text-ink-soft"
                }`}
              >
                <Chip tone={alert.isUrgent ? "brand" : undefined}>{alert.kind}</Chip>
                <span className="font-medium">{alert.title}</span>
                <span className="ml-auto shrink-0 text-xs opacity-70">{alert.date}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}

      {/* ---------------------------------------------------------------- *
          About, the fact bento and the conversion sidebar.

          No `overflow-hidden` here, deliberately. The backdrop pulls its blooms
          and rings outside the reading column but clips them against its own
          box — so a second clip on this wrapper buys nothing and costs the
          sidebar: an ancestor with `overflow` other than `visible` becomes the
          scrollport that `position: sticky` binds to, and the sticky sidebar
          silently stops sticking. It did exactly that.
       * ---------------------------------------------------------------- */}
       
      <div className="relative">
        <StoryBackdrop />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <SectionHeading eyebrow="The institution" title={`About ${college.name}`} />
              <Reveal delay={0.1}>
                <p className="mt-6 text-lg leading-relaxed text-ink-soft">{college.about}</p>
              </Reveal>
              <div className="mt-10">
                <FactMosaic items={facts} />
              </div>

              {/*
                Onward links.

                With the sections on separate pages the rail is the navigation,
                but the rail is a thin strip at the top that a visitor reading
                the introduction has already scrolled past. This is the same
                list again at the point they finish reading — which is where
                they decide what they want to know next.
              */}
              {onward.length > 0 && (
                <div className="mt-14">
                  <h2 className="font-display text-lg font-bold text-ink">
                    Explore {college.name}
                  </h2>
                  <RevealGroup className="mt-4 grid gap-3 sm:grid-cols-2" stagger={0.05}>
                    {onward.map((section) => (
                      <RevealItem key={section.slug}>
                        <Link
                          href={sectionHref(college.slug, section.slug)}
                          className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/50 hover:shadow-sm"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-sm font-bold text-ink transition-colors group-hover:text-brand">
                              {section.label}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                              {section.blurb(college)}
                            </span>
                          </span>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </div>
              )}
            </div>

            {/* Sidebar — the conversion tools. */}
            <aside className="space-y-5 lg:sticky lg:top-[150px] lg:self-start">
              {/*
                At a glance — the four numbers worth carrying beside the
                introduction. Rank and rating are in the hero, but a sticky copy
                is a reference, not a repeat. The two package figures are pulled
                forward from the Placements page, which is now a click away
                rather than a scroll.

                Kept to four so the whole sidebar clears a laptop viewport when
                pinned. A fifth tile pushes the callback button off-screen,
                which is the one thing in this column that has to stay visible.
              */}
              <Reveal>
                <div className="rounded-3xl border border-line bg-surface p-6">
                  <p className="font-display font-semibold text-ink">At a glance</p>
                  <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line">
                    {[
                      {
                        icon: <Trophy className="h-4 w-4" />,
                        label: `${college.ranking.authority} rank`,
                        value: `#${college.ranking.rank}`,
                      },
                      {
                        icon: <Star className="h-4 w-4" />,
                        label: "Student rating",
                        value: `${college.rating.toFixed(1)} / 5`,
                      },
                      {
                        icon: <TrendingUp className="h-4 w-4" />,
                        label: `Avg package ${college.placement.year}`,
                        value: college.placement.average,
                      },
                      {
                        icon: <Briefcase className="h-4 w-4" />,
                        label: "Highest package",
                        value: college.placement.highest,
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-surface p-4">
                        <span className="inline-flex text-brand">{stat.icon}</span>
                        <dd className="mt-2 font-display text-xl font-extrabold text-ink">
                          {stat.value}
                        </dd>
                        <dt className="mt-0.5 text-[11px] leading-tight text-ink-faint">
                          {stat.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                  {/* A route now, not an anchor. */}
                  <Link
                    href={sectionHref(college.slug, "placements")}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    See full placement record
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <form className="rounded-3xl border border-brand/30 bg-brand-soft p-6">
                  <p className="font-display text-lg font-bold text-brand-ink">Get a Callback</p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-ink/80">
                    Talk to an admission counsellor about {college.name}.
                  </p>
                  <div className="mt-5 space-y-3">
                    <input
                      required
                      placeholder="Full name"
                      className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
                    />
                    <input
                      required
                      type="tel"
                      placeholder="Mobile number"
                      className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                    >
                      Request Callback
                    </button>
                  </div>
                </form>
              </Reveal>

              <Reveal delay={0.16} className="rounded-3xl border border-line bg-surface p-6">
                <p className="font-display font-semibold text-ink">Contact Information</p>
                <p className="mt-2 text-sm text-ink-soft">
                  {college.city}, {college.state}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  admissions@{college.slug.split("-")[0]}.example
                </p>
              </Reveal>
            </aside>
          </div>
        </div>
      </div>

      {featuredReview && (
        <QuoteParallax
          quote={featuredReview.body}
          author={featuredReview.author}
          course={featuredReview.course}
          batch={featuredReview.batch}
          photo={collegePhoto(college.slug)}
        />
      )}

      {/* ---------------------------------------------------------------- *
          The tail: is this the right college?
       * ---------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl space-y-24 px-4 py-24 sm:px-6 lg:px-8">
        {/* Comparison against peers. Inline rather than behind a click: the
            comparison IS the answer to "is this the right college", and hiding
            it behind a link loses the visitors who would not take the extra
            step. */}
        {peers.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="Side by side"
              title={`${college.name} vs similar colleges`}
              lede={`Compared with the ${college.stream.toLowerCase()} colleges closest to it by ranking.`}
            />
            <Reveal className="mt-8" delay={0.1}>
              <ComparisonTable colleges={[college, ...peers]} />
            </Reveal>
            <Reveal delay={0.16}>
              <Link
                href={compareUrl([college.slug, ...peers.map((c) => c.slug)])}
                className="mt-6 inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
              >
                Open full comparison
              </Link>
            </Reveal>
          </section>
        )}

        {curatedPairs.length > 0 && (
          <section>
            <SectionHeading eyebrow="Verdicts" title="Which should you choose?" />
            <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {curatedPairs.map((comparison) => (
                <RevealItem key={comparison.slug}>
                  <Link
                    href={`/compare/${comparison.slug}`}
                    className="group block h-full rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                  >
                    <h3 className="font-display text-lg font-bold text-ink transition-colors group-hover:text-brand">
                      {comparison.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                      {comparison.intro}
                    </p>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        {/* Related colleges */}
        <section>
          <SectionHeading eyebrow="Keep looking" title="Similar Colleges You May Like" />
          {/* Two-up, not three: at three the cards are ~400px and every stat
              label wraps. Two gives each card ~630px, which is enough for the
              values to read on one line. */}
          <RevealGroup className="mt-10 grid gap-5 lg:grid-cols-2">
            {related.map((c) => (
              <RevealItem key={c.slug}>
                <CollegeCard college={c} />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      </div>
    </div>
  );
}
