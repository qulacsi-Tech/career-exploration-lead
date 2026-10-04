import { mergeHomeCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import Link from "next/link";
import Image from "next/image";
import { HeroBackdrop } from "./hero-backdrop";
import { TopExamCard } from "@/components/top-exam-card";
import { StreamTabs } from "@/components/ui/stream-tabs";
import { ViewAllButton } from "@/components/ui/view-all-button";
import { CareerPanelCard } from "@/components/career-panel-card";
import { DataHighlight } from "@/components/data-highlight";
import { LocationCarousel } from "@/components/location-carousel";
import { StreamGrid } from "@/components/stream-grid";
import { AutoStoryFrame } from "@/components/ui/auto-story-frame";
import { CollegeSlider } from "@/components/college-slider";
import { photoSetLedBy } from "@/lib/college-images";
import { NewspaperDispatch } from "@/components/newspaper-dispatch";
import { TopCollegeCard } from "@/components/top-college-card";
import { getCollectionBands, getHomeData } from "@/lib/api";

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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Home() {
  // ── Live data from FastAPI ────────────────────────────────────────────────
  // Falls back gracefully if the backend is unavailable during development.
  let home;
  try {
    home = await getHomeData();
  } catch {
    home = null;
  }

  const copy          = mergeHomeCopy(home?.homeCopy);
  const topExams      = home?.featuredExams      ?? [];
  const locations     = home?.locations          ?? [];
  const articles      = home?.articles           ?? [];
  const programs      = home?.recommendedPrograms ?? [];
  const careerPanels  = home?.careerPanels        ?? [];
  const universities  = home?.recommendedUniversities ?? [];
  const highlights    = home?.dataHighlights      ?? [];
  // homeStreams from API has {slug, name, count} — same shape as mock-data.ts homeStreams
  const homeStreams    = home?.streams            ?? [];

  // ── Collections (college bands) stay on local data until the collections ──
  // ── CMS API ships in a later phase                                        ──
  const visibleBands  = await getCollectionBands();

  // career panels in 3-column layout: left | middle (2 stacked) | right
  const careerColumns = careerPanels.length >= 4
    ? [[careerPanels[0]], [careerPanels[1], careerPanels[2]], [careerPanels[3]]]
    : careerPanels.map((p) => [p]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-ink">
        {copy.hero.image ? (
          // The picture comes from the API's own uploads, so it is a plain img rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(copy.hero.image)}
            alt={copy.hero.imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <HeroBackdrop />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/40"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display balance text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {copy.hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/90">
            {copy.hero.subheadline}
          </p>
          <form
            action="/search"
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-3xl border border-white/20 bg-surface p-2 shadow-lg sm:flex-row sm:items-center sm:gap-0 sm:rounded-full"
          >
            <label htmlFor="hero-stream" className="sr-only">Filter by stream</label>
            <div className="relative shrink-0 sm:border-r sm:border-line">
              <select
                id="hero-stream"
                name="stream"
                defaultValue=""
                className="w-full cursor-pointer appearance-none rounded-full bg-transparent py-2.5 pl-4 pr-9 text-sm font-medium text-ink focus:outline-none sm:w-auto"
              >
                <option value="">All streams</option>
                {streamTabs.map((stream) => (
                  <option key={stream} value={stream.toLowerCase()}>{stream}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>
            <input
              type="search"
              name="q"
              placeholder={copy.hero.searchPlaceholder}
              className="w-full bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {copy.hero.searchButton}
            </button>
          </form>
        </div>
      </section>

      {/* Browse by location */}
      <LocationCarousel locations={locations} copy={copy.locations} />

      {/* Explore Your Future — stream grid */}
      <StreamGrid streams={homeStreams} copy={copy.streams} />

      {/* College bands (from collections, backed by mock-data until CMS API) */}
      {visibleBands.map(({ collection, colleges: bandRows }, index) => (
        <section
          key={collection.id}
          className={`relative overflow-hidden border-b border-line ${index % 2 === 0 ? "bg-bg" : "bg-bg-alt"}`}
        >
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ink">
                {collection.heading || collection.title}
              </h2>
              {collection.subheading && (
                <p className="mt-2 text-sm text-ink-soft">{collection.subheading}</p>
              )}
            </div>
            {index === 0 && (
              <StreamTabs
                streams={streamTabs}
                active="Management"
                hrefFor={(stream) => `/${stream.toLowerCase()}/colleges`}
              />
            )}
            {bandRows.length > 3 ? (
              <CollegeSlider colleges={bandRows} label={collection.heading || collection.title} />
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {bandRows.map((college) => (
                  <TopCollegeCard key={college.slug} college={college} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <ViewAllButton href={`/colleges/${collection.slug}`} />
            </div>
          </div>
        </section>
      ))}

      {/* Top Exams — live from API */}
      <section className="relative overflow-hidden border-b border-line bg-bg-alt">
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink">
              {copy.topExams.heading}{" "}
              {copy.topExams.accent && <span className="italic text-brand">{copy.topExams.accent}</span>}
            </h2>
            {copy.topExams.subheading && (
              <p className="mt-2 text-sm text-ink-soft">{copy.topExams.subheading}</p>
            )}
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

      {/* Recommended Programs — live from API */}
      {programs.length > 0 && (
        <AutoStoryFrame
          tone="brand"
          title={copy.programs.heading}
          highlight={copy.programs.accent}
          items={programs.map((program) => ({
            key: program.slug,
            eyebrow: copy.programs.itemEyebrow,
            headline: program.name,
            subline: `Offered at ${program.university}`,
            images: photoSetLedBy(`/images/programs/${program.slug}.jpg`, program.slug, 2),
            imageAlt: `${program.name} program visual`,
            facts: [
              { label: "Online duration", value: program.online.duration },
              { label: "Online fees",     value: program.online.fees },
              { label: "On-campus duration", value: program.onCampus.duration },
              { label: "On-campus fees",  value: program.onCampus.fees },
            ],
            href: `/courses/${program.slug}`,
            cta: copy.programs.buttonLabel,
          }))}
        />
      )}

      {/* Explore Careers — live career panels from API */}
      {careerPanels.length > 0 && (
        <section className="relative overflow-hidden border-b border-line bg-bg">
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ink">
                {copy.careers.heading}{" "}
                {copy.careers.accent && <span className="italic text-brand">{copy.careers.accent}</span>}
              </h2>
              {copy.careers.subheading && (
                <p className="mt-2 text-sm text-ink-soft">{copy.careers.subheading}</p>
              )}
            </div>
            <StreamTabs
              streams={streamTabs}
              active="Management"
              hrefFor={(stream) => `/${stream.toLowerCase()}/careers`}
            />
            <div className="mt-10 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
              {careerColumns.map((panels, idx) => (
                <CareerPanelCard key={panels[0].title + idx} panels={panels} />
              ))}
            </div>
            {/* Promo banner */}
            <div className="relative mt-12 overflow-hidden rounded-2xl bg-brand px-8 py-10 sm:px-12">
              <div className="relative z-10 max-w-md">
                <p className="font-display text-lg font-bold text-white">
                  {copy.promoBanner.heading}
                </p>
                <Link
                  href={copy.promoBanner.buttonHref}
                  className="mt-6 inline-block rounded-full bg-white px-5 py-2 text-xs font-semibold text-brand transition hover:bg-brand-soft"
                >
                  {copy.promoBanner.buttonLabel}
                </Link>
              </div>
              <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
                {copy.promoBanner.image ? (
                  // Uploaded picture: plain img, as in the hero.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(copy.promoBanner.image)}
                    alt={copy.promoBanner.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src="/images/banners/promo-banner-campus.jpg"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 640px, 1px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-brand via-brand/55 to-brand/20" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommended Universities — live from API */}
      {universities.length > 0 && (
        <AutoStoryFrame
          title={copy.universities.heading}
          highlight={copy.universities.accent}
          items={universities.map((university) => ({
            key: university.slug,
            eyebrow: `${university.city}, ${university.state}`,
            headline: university.name,
            subline: copy.universities.itemSubline,
            images: photoSetLedBy(`/images/universities/${university.slug}.jpg`, university.slug, 2),
            imageAlt: `${university.name} campus`,
            facts: [
              { label: "City",  value: university.city },
              { label: "State", value: university.state },
            ],
            href: `/college/${university.slug}`,
            cta: copy.universities.buttonLabel,
          }))}
        />
      )}

      {/* Data highlights — live from API */}
      {highlights.length > 0 && (
        <section className="relative overflow-hidden border-b border-line bg-bg-tint">
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">
                {copy.data.heading}{" "}
                {copy.data.accent && <span className="italic text-brand">{copy.data.accent}</span>}
              </h2>
              {copy.data.subheading && (
                <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-ink">
                  {copy.data.subheading}
                </p>
              )}
            </div>
            <div className="mt-10 grid sm:grid-cols-2">
              {highlights.map((highlight, i) => (
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
      )}

      {/* Articles — live from API */}
      {articles.length > 0 && <NewspaperDispatch articles={articles} copy={copy.articles} />}
    </>
  );
}
