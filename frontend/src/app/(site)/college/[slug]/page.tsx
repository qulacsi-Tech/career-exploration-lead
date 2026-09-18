import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { CollegeCard } from "@/components/college-card";
import { Chip } from "@/components/ui/chip";
import { ArrowRight, Briefcase, Star, TrendingUp, Trophy } from "lucide-react";
import { CollegeHero } from "@/components/college/college-hero";
import { SectionRail } from "@/components/college/section-rail";
import { QuoteParallax } from "@/components/college/quote-parallax";
import { RecruiterMarquee } from "@/components/college/recruiter-marquee";
import { StoryBackdrop } from "@/components/college/story-backdrop";
import { StoryStep } from "@/components/college/story-step";
import { FactMosaic, type FactItem } from "@/components/college/fact-mosaic";
import { CourseCards } from "@/components/college/course-cards";
import { CutoffCards } from "@/components/college/cutoff-cards";
import { ReviewWall } from "@/components/college/review-wall";
import { CountUp, Reveal, RevealGroup, RevealItem } from "@/components/college/reveal";
import { collegePhoto, collegePhotoSet } from "@/lib/college-images";
import { colleges } from "@/lib/mock-data";
import {
  activeTabTemplates,
  tabBody,
  articlesFor,
  alertsFor,
  highlightsFor,
  videosFor,
  videoEmbedUrl,
} from "@/lib/college-content";
import { isRichTextEmpty } from "@/lib/rich-text";
import { RichText } from "@/components/rich-text";
import { ComparisonTable } from "@/components/comparison-table";
import {
  comparisonsFeaturing,
  similarColleges,
  compareUrl,
} from "@/lib/comparison-data";

/**
 * The college page, told as a scroll rather than listed as a document.
 *
 * ## The shape
 *
 * Four numbered steps carry the page — Overview, Courses & Fees, Cutoffs,
 * Reviews — each a node on a rail with a connector drawing down to the next,
 * over a shared field of drifting shapes. Between step three and step four sit
 * the two cinematic breaks: placements on a dark ground and a student's words
 * over a parallax photograph. So the page reads as one journey with an
 * interlude, not as eleven stacked sections.
 *
 * Every step is an interactive card grid rather than a table or a list:
 * programmes expand to show their entrance exams, cutoffs draw as dials,
 * the institution's facts are a bento, and the reviews sit beside a summary
 * panel whose bars grow on arrival.
 *
 * ## What deliberately did not change
 *
 * - **Every section stays in the document.** Nothing became a JS-switched
 *   panel. The page is still fully indexable and a shared link to #placements
 *   still lands in the right place.
 * - **It is still a server component.** Motion and interaction live in leaf
 *   client components under components/college/; the data, the metadata and
 *   the content itself render on the server.
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
  };
}

/** Section heading, used by every section so the rhythm is one rule. */
function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Reveal>
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.22em] ${
          dark ? "text-gold" : "text-brand"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={`mt-3 max-w-2xl text-sm leading-relaxed ${
            dark ? "text-white/70" : "text-ink-soft"
          }`}
        >
          {lede}
        </p>
      )}
    </Reveal>
  );
}

/**
 * Parses "₹12.5 LPA" into its number and the text around it, so the figure can
 * count up while the currency and the unit stay put.
 *
 * Placement figures are authored as display strings, not numbers — the model
 * has no separate amount field. Rather than change the data shape for a visual
 * effect, this reads the first number out of the string and keeps everything
 * before and after it verbatim. A string with no digits falls back to being
 * rendered as-is, so nothing can end up showing "NaN".
 */
function splitAmount(display: string) {
  const match = display.match(/[\d.]+/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals: match[0].includes(".") ? 1 : 0,
    prefix: display.slice(0, match.index),
    suffix: display.slice((match.index ?? 0) + match[0].length),
  };
}

/** A placement figure: counts up when it can be parsed, plain text when not. */
function PlacementFigure({ display }: { display: string }) {
  const parts = splitAmount(display);
  if (!parts) return <>{display}</>;
  return (
    <CountUp
      value={parts.value}
      decimals={parts.decimals}
      prefix={parts.prefix}
      suffix={parts.suffix}
    />
  );
}

/** How many steps the rail counts through. Overview, Courses, Cutoffs, Reviews. */
const TOTAL_STEPS = 4;

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const college = getCollege(slug);
  if (!college) notFound();

  const overall =
    college.ratingBreakdown.reduce((sum, r) => sum + r.score, 0) / college.ratingBreakdown.length;

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
  const articles = articlesFor(college.slug);
  const highlights = highlightsFor(college.slug);
  const videos = videosFor(college.slug);

  const heroPhoto = collegePhoto(college.slug);
  /* Resolved once, not per tile: the set is deterministic for a slug, so
     recomputing it inside the gallery map would hash the slug six times for
     the same answer. */
  const galleryPhotos = collegePhotoSet(college.slug, highlights.length);

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
   * Overview step they are the thing being read: the paragraph says what the
   * college is, the tiles say what it is made of.
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
      wide: true,
    },
    {
      icon: "scroll",
      label: "Entrance exams",
      value: `${college.examsAccepted.length} accepted`,
      note: "Admission is open to candidates holding a score in:",
      chips: college.examsAccepted,
      wide: true,
    },
  ];

  /**
   * Configurable tabs, filtered to the ones this college has actually written
   * something into — the MOM's "tabs should only appear on the frontend when
   * content is available" (§1.2).
   *
   * `isRichTextEmpty` rather than a length check: an editor who opens the field
   * and closes it leaves one empty paragraph behind, which is structurally
   * non-empty. Without that distinction every untouched tab would render as a
   * heading over nothing.
   */
  const customTabs = activeTabTemplates()
    .map((template) => ({ template, body: tabBody(college.slug, template.slug) }))
    .filter(({ body }) => !isRichTextEmpty(body));

  /**
   * The in-page rail. Built from what exists rather than hard-coded, so a
   * college with no videos gets no dead "Videos" link. Order matches the DOM,
   * which is what the rail's scroll-spy reads back.
   */
  const sections = [
    { id: "about", label: "Overview" },
    { id: "courses", label: "Courses & Fees" },
    { id: "cutoffs", label: "Cutoffs" },
    { id: "placements", label: "Placements" },
    ...(highlights.length > 0 ? [{ id: "gallery", label: "Campus" }] : []),
    ...(videos.length > 0 ? [{ id: "videos", label: "Videos" }] : []),
    ...customTabs.map(({ template }) => ({ id: template.slug, label: template.label })),
    ...(articles.length > 0 ? [{ id: "articles", label: "Articles" }] : []),
    { id: "reviews", label: "Reviews" },
  ];

  /* Clears the sticky header and the sticky rail together, so an anchor jump
     lands the heading below both rather than behind them. */
  const anchorOffset = "scroll-mt-[150px]";

  return (
    <div>
      <CollegeHero
        name={college.name}
        city={college.city}
        state={college.state}
        ownership={college.ownership}
        established={college.established}
        approvals={college.approvals}
        rank={college.ranking.rank}
        authority={college.ranking.authority}
        rating={college.rating}
        reviewCount={college.reviewCount}
        feesRange={college.feesRange}
        photo={heroPhoto}
      />

      <SectionRail sections={sections} />

      {/* Alerts stay directly under the rail: an application deadline is the
          most time-sensitive thing on the page, and burying it below the fees
          table makes it useless. */}
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
          Steps 01–03, over one continuous shape field.

          No `overflow-hidden` here, deliberately. The backdrop pulls its
          blooms and rings outside the reading column, but it clips them
          against its own box — so a second clip on this wrapper buys nothing
          and costs the sidebar: an ancestor with `overflow` other than
          `visible` becomes the scrollport that `position: sticky` binds to,
          and the sticky sidebar silently stops sticking. It did exactly that.
       * ---------------------------------------------------------------- */}
      <div className="relative">
        <StoryBackdrop />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* The steps run flush against each other so the rail's connector
                is continuous; the breathing room is padding inside each step,
                which the line runs through. */}
            <div className="min-w-0">
              <StoryStep
                index={1}
                total={TOTAL_STEPS}
                label="Overview"
                id="about"
                className={`pb-20 ${anchorOffset}`}
              >
                <SectionHeading eyebrow="The institution" title={`About ${college.name}`} />
                <Reveal delay={0.1}>
                  <p className="mt-6 text-lg leading-relaxed text-ink-soft">{college.about}</p>
                </Reveal>
                <div className="mt-10">
                  <FactMosaic items={facts} />
                </div>
              </StoryStep>

              <StoryStep
                index={2}
                total={TOTAL_STEPS}
                label="Courses & Fees"
                id="courses"
                className={`pb-20 ${anchorOffset}`}
              >
                <SectionHeading
                  eyebrow="What you can study"
                  title="Courses & Fees"
                  lede={`${college.coursesOffered} programmes on offer. Open a card for the entrance exams that programme accepts.`}
                />
                <div className="mt-10">
                  <CourseCards courses={college.courses} />
                </div>
              </StoryStep>

              {/* Last step before the page breaks away into the placements
                  band, so no connector is drawn downward from it. */}
              <StoryStep
                index={3}
                total={TOTAL_STEPS}
                label="Cutoffs"
                id="cutoffs"
                connector={false}
                className={anchorOffset}
              >
                <SectionHeading
                  eyebrow="What it takes to get in"
                  title="Cutoffs"
                  lede="The closing score from last season, by exam and category."
                />
                <div className="mt-10">
                  <CutoffCards cutoffs={college.cutoffs} />
                </div>
              </StoryStep>
            </div>

            {/* Sidebar. Now only the conversion tools — the facts it used to
                carry are the Overview bento, where they are actually read. */}
            <aside className="space-y-5 lg:sticky lg:top-[150px] lg:self-start">
              {/*
                At a glance — the four numbers worth carrying alongside the
                whole of act one.

                Rank and rating are in the hero, but the hero is a screen and a
                half behind by the time anyone is reading cutoffs; a sticky
                copy is a reference, not a repeat. The two package figures are
                genuinely pulled forward — they otherwise live in the
                placements band below the interlude, which is after the point
                where a visitor decides whether these courses are worth the
                fee.

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
                  {/* Straight to the section rather than a dead-end figure. */}
                  <a
                    href="#placements"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    See full placement record
                    <ArrowRight className="h-4 w-4" />
                  </a>
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

      {/* ---------------------------------------------------------------- *
          The interlude: placements on a dark ground, then a student.
       * ---------------------------------------------------------------- */}
      <section
        id="placements"
        className={`relative overflow-hidden bg-brand-ink ${anchorOffset}`}
      >
        {/* A soft brand bloom behind the figures, so the band is not a flat
            rectangle of one colour behind four numbers. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-brand/30 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-gold/15 blur-[120px]"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={`Class of ${college.placement.year}`}
            title="Where this degree takes you"
            lede="Verified packages from the most recent placement season, and the companies that hired on campus."
            tone="dark"
          />

          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { label: "Average package", value: college.placement.average },
              { label: "Median package", value: college.placement.median },
              { label: "Highest package", value: college.placement.highest },
            ].map((figure) => (
              <RevealItem
                key={figure.label}
                className="rounded-2xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl"
              >
                <p className="font-display text-4xl font-extrabold text-white">
                  <PlacementFigure display={figure.value} />
                </p>
                <p className="mt-2 text-sm text-white/65">{figure.label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* The recruiter roster, on the light ground the marquee's edge fades
            are drawn against. */}
        <div className="relative border-t border-white/10 bg-bg-alt py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
              Top recruiters on campus
            </p>
          </div>
          <RecruiterMarquee recruiters={college.placement.topRecruiters} />
        </div>
      </section>

      {featuredReview && (
        <QuoteParallax
          quote={featuredReview.body}
          author={featuredReview.author}
          course={featuredReview.course}
          batch={featuredReview.batch}
          photo={heroPhoto}
        />
      )}

      {/* ---------------------------------------------------------------- *
          Step 04, on its own shape field so the journey visibly resumes
          after the interlude. Same reasoning as above on the missing
          `overflow-hidden` — the review summary panel is sticky too.
       * ---------------------------------------------------------------- */}
      <div className="relative">
        <StoryBackdrop />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <StoryStep
            index={4}
            total={TOTAL_STEPS}
            label="Reviews"
            id="reviews"
            connector={false}
            className={anchorOffset}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="In their words"
                title={`Student Reviews (${college.reviewCount})`}
                lede="How students rate the place they actually studied — and what they wrote about it."
              />
              <Reveal>
                <Link
                  href="/enquiry"
                  className="inline-block rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
                >
                  Write a Review
                </Link>
              </Reveal>
            </div>
            <div className="mt-10">
              <ReviewWall
                overall={overall}
                reviewCount={college.reviewCount}
                breakdown={college.ratingBreakdown}
                reviews={college.reviews}
              />
            </div>
          </StoryStep>
        </div>
      </div>

      {/* ---------------------------------------------------------------- *
          The tail: everything a visitor explores after they have decided.
       * ---------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl space-y-24 px-4 pb-24 sm:px-6 lg:px-8">
        {/* Campus gallery */}
        {highlights.length > 0 && (
          <section id="gallery" className={anchorOffset}>
            <SectionHeading
              eyebrow="Life on campus"
              title="Inside the campus"
              lede="The buildings, the labs and the spaces students actually spend their day in."
            />
            {/*
              A mosaic rather than a uniform grid: the first frame runs two
              columns wide, so the eye has somewhere to land instead of reading
              six equal tiles left to right.

              The photography is paired positionally from the shared pool —
              `GalleryImage` carries a name and alt text but no URL yet, since
              the media library has no storage behind it. When it does, this
              becomes `image.url` and nothing else here changes.
            */}
            <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((image, i) => (
                <RevealItem
                  key={image.id}
                  className={i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
                >
                  <figure className="group relative h-full overflow-hidden rounded-2xl border border-line bg-bg-alt">
                    <div className={i === 0 ? "aspect-[16/10]" : "aspect-[4/3]"}>
                      <Image
                        src={galleryPhotos[i % galleryPhotos.length]}
                        alt={image.alt}
                        fill
                        sizes={
                          i === 0
                            ? "(max-width: 640px) 100vw, 66vw"
                            : "(max-width: 640px) 100vw, 33vw"
                        }
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                      />
                    </div>
                    {/* The caption rides in from the bottom on hover; the
                        scrim under it is what keeps the name legible over
                        whatever the photograph happens to be. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-sm font-semibold text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      {image.name}
                    </figcaption>
                  </figure>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        {/* Videos, embedded rather than hosted. `loading="lazy"` matters here:
            an eager iframe pulls the provider's player on every page load,
            which is a large third-party cost for content below the fold. */}
        {videos.length > 0 && (
          <section id="videos" className={anchorOffset}>
            <SectionHeading eyebrow="Watch" title="Videos" />
            <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2">
              {videos.map((video) => (
                <RevealItem key={video.id}>
                  <figure>
                    <div className="aspect-video overflow-hidden rounded-2xl border border-line">
                      <iframe
                        src={videoEmbedUrl(video)}
                        title={video.title}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <figcaption className="mt-2.5 text-sm font-medium text-ink-soft">
                      {video.title}
                    </figcaption>
                  </figure>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        {/* Configurable tabs. Already filtered to non-empty above, so there is
            no empty-heading case to guard here. */}
        {customTabs.map(({ template, body }) => (
          <section key={template.slug} id={template.slug} className={anchorOffset}>
            <SectionHeading eyebrow="More" title={template.label} />
            <Reveal delay={0.1}>
              <RichText doc={body} className="mt-6 max-w-3xl" />
            </Reveal>
          </section>
        ))}

        {/* Articles */}
        {articles.length > 0 && (
          <section id="articles" className={anchorOffset}>
            <SectionHeading eyebrow="Editorial" title={`Articles about ${college.name}`} />
            <RevealGroup className="mt-10 grid gap-5 lg:grid-cols-3">
              {articles.map((article) => (
                <RevealItem
                  key={article.slug}
                  as="article"
                  className="group rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  <p className="text-xs text-ink-faint">
                    {article.publishedAt} &middot; {article.author}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink transition-colors group-hover:text-brand">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{article.summary}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

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
