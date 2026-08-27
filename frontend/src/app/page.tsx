import Link from "next/link";
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
  colleges,
  exams,
  locations,
  articles,
  recommendedPrograms,
  careerPanels,
  recommendedUniversities,
  dataHighlights,
} from "@/lib/mock-data";

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

const topColleges = [...colleges, ...colleges].slice(0, 6);
const topExams = exams.slice(0, 6);

const streams = [
  { name: "Management", count: 4172 },
  { name: "Engineering", count: 3860 },
  { name: "Medical", count: 2104 },
  { name: "Arts", count: 1988 },
  { name: "Commerce", count: 1520 },
  { name: "Law", count: 640 },
];

/** Explore Careers is three columns; the middle one stacks two panels. */
const careerColumns = [[careerPanels[0]], [careerPanels[1], careerPanels[2]], [careerPanels[3]]];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-ink">
        {/*
          Decorative backdrop. Purely presentational, so it stays a CSS
          background rather than <Image>: no alt text to invent and nothing for
          the a11y tree. To swap in a client photo, point the url() at it and
          re-check the overlay below — that overlay is the only thing keeping
          the headline legible over whatever lands here.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url(/hero-background.svg)] bg-cover bg-center bg-no-repeat"
        />
        {/*
          Overlay. Weighted to the middle band where the copy sits, lighter at
          the edges so the skyline and caps still read. Tuned against the
          brightest point of the art (the glow behind the search field), where
          the white headline still measures 10.2:1 and the subtitle 8.6:1.
          Greens sit higher in WCAG luminance than the reds this scene was
          first tuned for, so re-measure if the palette moves again.
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
          <form
            action="/search"
            className="mx-auto mt-8 flex max-w-xl items-center rounded-full border border-white/20 bg-surface px-2 py-2 shadow-lg"
          >
            <input
              type="search"
              name="q"
              placeholder="Search by college, course or exam"
              className="w-full bg-transparent px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
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
            {streams.map((s) => (
              <Link
                key={s.name}
                href={`/${s.name.toLowerCase()}/colleges`}
                className="rounded-xl bg-white/10 px-5 py-5 text-left text-white transition hover:bg-white/20"
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-white/70">{s.count.toLocaleString()} colleges</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top colleges */}
      <section className="border-b border-line bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink">Top Colleges</h2>
            <p className="mt-2 text-sm text-ink-soft">Colleges Cherry Picked For You</p>
          </div>

          <StreamTabs
            streams={streamTabs}
            active="Management"
            hrefFor={(stream) => `/${stream.toLowerCase()}/colleges`}
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topColleges.map((college, i) => (
              <TopCollegeCard key={`${college.slug}-${i}`} college={college} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <ViewAllButton href="/colleges" />
          </div>
        </div>
      </section>

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
            {/* Decorative stand-in for the campus artwork that sits on the right of this banner. */}
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 hidden w-2/5 items-center justify-center text-white/40 lg:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M21 16l-5.5-5.5a1.5 1.5 0 00-2.12 0L4 19" stroke="currentColor" strokeWidth="1.5" />
              </svg>
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
            <h2 className="font-display text-3xl font-bold text-ink">Latest News &amp; Updates</h2>
            <Link href="/articles" className="text-sm font-semibold text-brand hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand/40 hover:shadow-sm"
              >
                <p className="text-xs text-ink-faint">{a.date}</p>
                <p className="mt-2 font-display font-semibold text-ink">{a.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
