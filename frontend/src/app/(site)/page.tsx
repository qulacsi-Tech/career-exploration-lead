import Link from "next/link";
import Image from "next/image";
import { HeroBackdrop } from "./hero-backdrop";
// import { ThemeSwitcher } from "@/components/theme-switcher";
import { TopCollegeCard } from "@/components/top-college-card";
import { TopExamCard } from "@/components/top-exam-card";
import { StreamTabs } from "@/components/ui/stream-tabs";
import { ViewAllButton } from "@/components/ui/view-all-button";
import { RecommendedProgramCard } from "@/components/recommended-program-card";
import { CareerPanelCard } from "@/components/career-panel-card";
import { UniversityCard } from "@/components/university-card";
import { DataHighlight } from "@/components/data-highlight";
import { LocationCarousel } from "@/components/location-carousel";
import {
  exams,
  locations,
  articles,
  recommendedPrograms,
  careerPanels,
  recommendedUniversities,
  dataHighlights,
  homeStreams,
} from "@/lib/mock-data";
import { homepageBands, bandColleges } from "@/lib/rankings-data";

const streamTabs = [
  "Management",
  "Engineering",
  "Medical",
  "Science",
  "Arts",
  "Commerce",
  "Pharmacy",
  "Law",
  "Paramedical",
];

/**
 * The college bands, resolved through the same selector the admin preview uses
 * so the page and the editor cannot disagree.
 *
 * Was `[...colleges, ...colleges].slice(0, 6)` — the directory padded out to
 * fill a six-card grid. Each band now comes from a ranking list chosen in
 * Admin → Sections → Homepage, which is what MOM §1.7 asks for.
 */
const visibleBands = homepageBands
  .filter((band) => band.isVisible)
  .map((band) => ({ band, colleges: bandColleges(band) }))
  // A band bound to an empty ranking list renders as a heading over nothing,
  // so it is dropped rather than shown hollow.
  .filter(({ colleges }) => colleges.length > 0);
const topExams = exams.slice(0, 6);

/** Explore Careers is three columns; the middle one stacks two panels. */
const careerColumns = [[careerPanels[0]], [careerPanels[1], careerPanels[2]], [careerPanels[3]]];

/** Caret for the hero's stream filter — the native select arrow is hidden by
 *  appearance-none so the control can match the pill it sits in. */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-ink">
        {/*
          Decorative backdrop. Inline SVG rather than a background image so it
          reads the --hero-* custom properties and recolours with the palette
          switcher; see hero-backdrop.tsx.
        */}
        <HeroBackdrop />
        {/*
          Overlay. Weighted to the middle band where the copy sits, lighter at
          the edges so the skyline and caps still read. Tuned against the
          brightest point of the art (the glow behind the search field). That
          point moves with the palette, so it is measured per variant — the
          worst case across all seven is 14.1:1 for the headline (tangerine);
          the per-variant figures are recorded in globals.css.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/40"
        />

        {/* relative so the content paints above both backdrop layers */}
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display balance text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            Find Colleges, Courses &amp; Exams That Are Best For You
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/90">
            Search 30,000+ colleges, compare fees and placements, and get free counselling from admission experts.
          </p>
          {/* Stacks on small screens: a select, an input and a button do not fit
              on one row at phone widths without squeezing the input to nothing.
              The divider is a border that only exists once they sit side by
              side. */}
          <form
            action="/search"
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-3xl border border-white/20 bg-surface p-2 shadow-lg sm:flex-row sm:items-center sm:gap-0 sm:rounded-full"
          >
            <label htmlFor="hero-stream" className="sr-only">
              Filter by stream
            </label>
            <div className="relative shrink-0 sm:border-r sm:border-line">
              <select
                id="hero-stream"
                name="stream"
                defaultValue=""
                className="w-full cursor-pointer appearance-none rounded-full bg-transparent py-2.5 pl-4 pr-9 text-sm font-medium text-ink focus:outline-none sm:w-auto"
              >
                <option value="">All streams</option>
                {streamTabs.map((stream) => (
                  <option key={stream} value={stream.toLowerCase()}>
                    {stream}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>

            <input
              type="search"
              name="q"
              placeholder="Search by college, course or exam"
              className="w-full bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Browse by location */}
      <section className="border-b border-line bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-ink">Browse By Location</h2>
          <div className="mt-8">
            <LocationCarousel locations={locations} />
          </div>
        </div>
      </section>

      {/* Explore your future */}
      <section className="bg-brand py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-white">Explore Your Future</h2>
          <p className="mt-2 text-sm text-white/80">Select a stream to see colleges cherry-picked for you</p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {homeStreams.map((s) => (
              <Link
                key={s.name}
                href={`/${s.slug}/colleges`}
                className="rounded-xl bg-white/10 px-5 py-5 text-left text-white transition hover:bg-white/20"
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-white/70">{s.count.toLocaleString()} colleges</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* College bands. Repeatable, so "Popular Colleges" can sit alongside
          "Recommended Colleges" rather than replacing it. Alternating grounds
          keep adjacent bands from reading as one long section. */}
      {visibleBands.map(({ band, colleges: bandRows }, index) => (
        <section
          key={band.id}
          className={`border-b border-line ${index % 2 === 0 ? "bg-bg" : "bg-bg-alt"}`}
        >
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ink">{band.heading}</h2>
              {band.subheading && (
                <p className="mt-2 text-sm text-ink-soft">{band.subheading}</p>
              )}
            </div>

            {/* Only the first band carries the stream tabs: repeating them under
                every heading turns a navigation aid into wallpaper. */}
            {index === 0 && (
              <StreamTabs
                streams={streamTabs}
                active="Management"
                hrefFor={(stream) => `/${stream.toLowerCase()}/colleges`}
              />
            )}

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bandRows.map((college) => (
                <TopCollegeCard key={college.slug} college={college} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <ViewAllButton href="/colleges" />
            </div>
          </div>
        </section>
      ))}

      {/* Top exams — warm neutral band so it reads apart from Top Colleges */}
      <section className="border-b border-line bg-bg-alt">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink">Top Exams</h2>
            <p className="mt-2 text-sm text-ink-soft">Exams Cherry Picked For You</p>
          </div>

          <StreamTabs
            streams={streamTabs}
            active="Management"
            hrefFor={(stream) => `/${stream.toLowerCase()}/exams`}
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topExams.map((exam) => (
              <TopExamCard key={exam.slug} exam={exam} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <ViewAllButton href="/exams" />
          </div>
        </div>
      </section>

      {/* Recommended colleges */}
      <section className="bg-brand py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-white">Recommended Colleges</h2>
          <div className="mt-10 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedPrograms.map((program) => (
              <RecommendedProgramCard key={program.slug} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* Explore careers */}
      <section className="border-b border-line bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink">Explore Careers</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Explore your preferred streams to learn about the relevant colleges, exams and more!
            </p>
          </div>

          <StreamTabs
            streams={streamTabs}
            active="Management"
            hrefFor={(stream) => `/${stream.toLowerCase()}/careers`}
          />

          <div className="mt-10 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            {careerColumns.map((panels) => (
              <CareerPanelCard key={panels[0].title} panels={panels} />
            ))}
          </div>

          {/* Promo banner */}
          <div className="relative mt-12 overflow-hidden rounded-2xl bg-brand px-8 py-10 sm:px-12">
            <div className="relative z-10 max-w-md">
              <p className="font-display text-lg font-bold text-white">
                Browse through our list of popular programs and universities
              </p>
              <Link
                href="/colleges"
                className="mt-6 inline-block rounded-full bg-white px-5 py-2 text-xs font-semibold text-brand transition hover:bg-brand-soft"
              >
                Discover More
              </Link>
            </div>
            {/* Campus artwork illustration on right of banner */}
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 hidden w-1/2 items-center justify-end pr-4 lg:flex"
            >
              <div className="relative h-full w-full max-w-sm">
                <Image
                  src="/images/banners/promo-banner-campus.svg"
                  alt="Campus illustration"
                  fill
                  // Only rendered at lg and up, where max-w-sm caps the box at
                  // 384px. Below that the wrapper is display:none.
                  sizes="(min-width: 1024px) 384px, 1px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended university */}
      <section className="border-b border-line bg-bg-alt">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-ink">Recommended University</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedUniversities.map((university) => (
              <UniversityCard key={university.slug} university={university} />
            ))}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="border-b border-line bg-bg-tint">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Data</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-ink">
              We simplify information for you on over 30,000 colleges, 500 exams and 500 courses across
              domains and regions all over India
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2">
            {dataHighlights.map((highlight, i) => (
              <div
                key={highlight.slug}
                className={`border-t border-line ${i % 2 === 0 ? "sm:border-r" : ""}`}
              >
                <DataHighlight highlight={highlight} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Latest News &amp; Updates</h2>
            <Link href="/articles" className="text-sm font-semibold text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-brand/40 hover:shadow-sm"
              >
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-bg-alt sm:aspect-[16/9]">
                  <Image
                    src={`/images/articles/${a.slug}.svg`}
                    alt={a.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-6">
                  <p className="text-xs text-ink-faint">{a.date}</p>
                  <p className="mt-1.5 font-display text-sm font-semibold text-ink group-hover:text-brand sm:mt-2 sm:text-base">
                    {a.title}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-soft sm:mt-2 sm:text-sm">{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Client-review palette picker. Homepage only; remove once a variant is
          signed off. See components/theme-switcher.tsx. */}
      {/* Palette review is settled on Tangerine; see lib/themes.ts. */}
      {/* <ThemeSwitcher /> */}
    </>
  );
}
