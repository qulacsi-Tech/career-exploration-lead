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
import { StoryStreamExplorer } from "@/components/story-stream-explorer";
import { SectionJourneyConnector } from "@/components/ui/section-journey-connector";
import { LeafGlow } from "@/components/ui/leaf-glow";
import { AutoStoryFrame } from "@/components/ui/auto-story-frame";
import { NewspaperDispatch } from "@/components/newspaper-dispatch";
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
import { homepageCollections, collectionHref } from "@/lib/collections-data";

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
 * fill a six-card grid, then bands bound to ranking lists (MOM §1.7). Each band
 * is now a *collection* placed on the homepage: the group of colleges is edited
 * under Content → Collections, where it also owns a page and can fill a footer
 * column, and this page reads its homepage placements.
 *
 * Hidden, unpublished and empty ones are dropped inside the selector — a band
 * is a heading over nothing otherwise.
 */
const visibleBands = homepageCollections();
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

      {/* Browse by location — an auto-running deck in its own full frame */}
      <LocationCarousel locations={locations} />

      {/* Storytelling Journey Connector Bridge */}
      <SectionJourneyConnector
        fromBadge="Step 01: Regional Hubs"
        toBadge="Step 02: Academic Streams"
        title="Connect location with your target discipline"
      />

      {/* Explore your future - Interactive Story Stream Explorer */}
      <StoryStreamExplorer streams={homeStreams} />

      {/* College bands. Repeatable, so "Popular Colleges" can sit alongside
          "Recommended Colleges" rather than replacing it. Alternating grounds
          keep adjacent bands from reading as one long section. */}
      {visibleBands.map(({ collection, colleges: bandRows }, index) => (
        <section
          key={collection.id}
          className={`relative overflow-hidden border-b border-line ${index % 2 === 0 ? "bg-bg" : "bg-bg-alt"}`}
        >
          <LeafGlow variant={2 + index} />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* `heading` is the homepage-specific wording when the page
                  title is written for search ("Top Colleges" here, "Top
                  Management Colleges in India" on the page itself). */}
              <h2 className="font-display text-3xl font-bold text-ink">
                {collection.heading || collection.title}
              </h2>
              {collection.subheading && (
                <p className="mt-2 text-sm text-ink-soft">{collection.subheading}</p>
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
              {/* The band's own page, not the directory: a visitor clicking
                  through "Top Colleges" wants more of those, not all 30,000. */}
              <ViewAllButton href={collectionHref(collection)} />
            </div>
          </div>
        </section>
      ))}

      {/* Top exams — warm neutral band so it reads apart from Top Colleges */}
      <section className="relative overflow-hidden border-b border-line bg-bg-alt">
        <LeafGlow variant={5} />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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

      {/* Recommended colleges — one programme at a time, told as an editorial
          spread: the picture sits inside the copy and the type wraps it. */}
      <AutoStoryFrame
        segment={6}
        tone="brand"
        label="Recommended"
        title="Programs worth"
        highlight="a closer look"
        items={recommendedPrograms.map((program) => ({
          key: program.slug,
          eyebrow: "Online & On-campus",
          headline: program.name,
          subline: `Offered at ${program.university}`,
          image: `/images/programs/${program.slug}.svg`,
          imageAlt: `${program.name} program visual`,
          facts: [
            { label: "Online duration", value: program.online.duration },
            { label: "Online fees", value: program.online.fees },
            { label: "On-campus duration", value: program.onCampus.duration },
            { label: "On-campus fees", value: program.onCampus.fees },
          ],
          href: `/courses/${program.slug}`,
          cta: "Explore this program",
        }))}
      />

      {/* Explore careers */}
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <LeafGlow variant={7} />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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

      {/* Recommended university — same editorial frame, quieter ground */}
      <AutoStoryFrame
        segment={8}
        label="Recommended"
        title="Campuses shaping"
        highlight="their regions"
        items={recommendedUniversities.map((university) => ({
          key: university.slug,
          eyebrow: `${university.city}, ${university.state}`,
          headline: university.name,
          subline: "Accredited programs, verified placement records and open intakes.",
          image: `/images/universities/${university.slug}.svg`,
          imageAlt: `${university.name} campus`,
          facts: [
            { label: "City", value: university.city },
            { label: "State", value: university.state },
          ],
          href: `/college/${university.slug}`,
          cta: "Know more",
        }))}
      />

      {/* Data */}
      <section className="relative overflow-hidden border-b border-line bg-bg-tint">
        <LeafGlow variant={9} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
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
                className={`border-t border-white/70 bg-surface/45 backdrop-blur-xl ${i % 2 === 0 ? "sm:border-r" : ""}`}
              >
                <DataHighlight highlight={highlight} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles — set as a broadsheet that folds itself to the next edition */}
      <NewspaperDispatch articles={articles} />

      {/* Client-review palette picker. Homepage only; remove once a variant is
          signed off. See components/theme-switcher.tsx. */}
      {/* Palette review is settled on Tangerine; see lib/themes.ts. */}
      {/* <ThemeSwitcher /> */}
    </>
  );
}
