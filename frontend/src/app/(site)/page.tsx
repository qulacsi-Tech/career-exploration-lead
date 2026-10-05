import { mergeHomeCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import Link from "next/link";
import Image from "next/image";
import { HeroCarousel } from "@/components/hero-carousel";
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
import { getCollectionBands, getHomeData, type HomeLocation } from "@/lib/api";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── TEMPORARY static data for checking the destination stack's design ─────────
// Remove this block (and the matching lines inside Home()) when the check is done.
const STATIC_LOCATIONS: HomeLocation[] = [
  {
    slug: "bangalore", name: "Bangalore", state: "Karnataka", collegeCount: 214,
    labels: ["Silicon Valley of India", "Top Startup Ecosystem"],
    description: "Global epicenter for IT, Artificial Intelligence, Product Startups & Tech Giants.",
    avgPackage: "₹8.5 - 24 LPA", image: "/images/locations/bangalore.jpg",
    courseFees: [{ category: "MBA", fees: "₹8L - 22L" }, { category: "B.Tech", fees: "₹4L - 16L" }, { category: "Medical", fees: "₹12L - 30L" }],
  },
  {
    slug: "hyderabad", name: "Hyderabad", state: "Telangana", collegeCount: 156,
    labels: ["Cyber City & Biotech", "Highest Growth Index"],
    description: "Rapidly expanding IT corridor, pharmaceutical research & Fortune 500 campuses.",
    avgPackage: "₹7.5 - 20 LPA", image: "/images/locations/hyderabad.jpg",
    courseFees: [{ category: "MBA", fees: "₹6L - 18L" }, { category: "B.Tech", fees: "₹3L - 14L" }, { category: "Pharmacy", fees: "₹2L - 8L" }],
  },
  {
    slug: "pune", name: "Pune", state: "Maharashtra", collegeCount: 189,
    labels: ["Oxford of the East", "Student Capital"],
    description: "Academic heritage, premier automotive design, research & manufacturing hubs.",
    avgPackage: "₹7.0 - 18 LPA", image: "/images/locations/pune.jpg",
    courseFees: [{ category: "MBA", fees: "₹7L - 20L" }, { category: "Engineering", fees: "₹3L - 12L" }, { category: "Design", fees: "₹4L - 10L" }],
  },
  {
    slug: "mumbai", name: "Mumbai", state: "Maharashtra", collegeCount: 241,
    labels: ["Financial Capital", "Finance & Corporate HQ"],
    description: "Headquarters of India's major investment banks, consulting & media powerhouses.",
    avgPackage: "₹9.0 - 28 LPA", image: "/images/locations/mumbai.jpg",
    courseFees: [{ category: "MBA", fees: "₹10L - 26L" }, { category: "Commerce", fees: "₹1L - 6L" }, { category: "Law", fees: "₹3L - 12L" }],
  },
  {
    slug: "delhi-ncr", name: "Delhi NCR", state: "Delhi", collegeCount: 302,
    labels: ["National Corporate Hub", "Leadership & Policy Hub"],
    description: "Center of policy, diplomacy, FMCG giants & fast-growing tech conglomerates.",
    avgPackage: "₹8.0 - 25 LPA", image: "/images/locations/delhi-ncr.jpg",
    courseFees: [{ category: "MBA", fees: "₹9L - 24L" }, { category: "B.Tech", fees: "₹4L - 15L" }, { category: "Law", fees: "₹4L - 14L" }],
  },
  {
    slug: "chennai", name: "Chennai", state: "Tamil Nadu", collegeCount: 167,
    labels: ["Industrial & IT Powerhouse", "Core Tech & Research"],
    description: "Renowned research institutions, health-tech revolution & automotive manufacturing.",
    avgPackage: "₹6.8 - 18 LPA", image: "/images/locations/chennai.jpg",
    courseFees: [{ category: "MBA", fees: "₹5L - 16L" }, { category: "Engineering", fees: "₹3L - 13L" }, { category: "Medical", fees: "₹10L - 28L" }],
  },
];

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
  // TEMPORARY: static destination cards to check the stacking UI. To go back to live data,
  // delete the STATIC_LOCATIONS block below and uncomment the next line.
  // const locations     = home?.homeLocations      ?? [];
  const locations: HomeLocation[] = STATIC_LOCATIONS;
  const articles      = home?.articles           ?? [];
  const programs      = home?.recommendedPrograms ?? [];
  const careerPanels  = home?.careerPanels        ?? [];
  const universities  = home?.recommendedUniversities ?? [];
  const highlights    = home?.dataHighlights      ?? [];
  // The Fields grid and every stream link below come from the admin's list, nothing hard-coded.
  const fields        = home?.fields             ?? [];
  const heroItems     = home?.heroItems          ?? [];
  const streamTabs    = fields.map((f) => f.name);
  const slugOfStream  = new Map(fields.map((f) => [f.name, f.slug]));

  // ── Collections (college bands) stay on local data until the collections ──
  // ── CMS API ships in a later phase                                        ──
  const visibleBands  = await getCollectionBands();

  // career panels in 3-column layout: left | middle (2 stacked) | right
  const careerColumns = careerPanels.length >= 4
    ? [[careerPanels[0]], [careerPanels[1], careerPanels[2]], [careerPanels[3]]]
    : careerPanels.map((p) => [p]);

  return (
    <>
      {/* Hero: one slide shows plain, several rotate. The search box stays under them. */}
      <HeroCarousel items={heroItems}>
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
                {fields.map((field) => (
                  <option key={field.slug} value={field.slug}>{field.name}</option>
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
      </HeroCarousel>

      {/* Browse by location */}
      <LocationCarousel locations={locations} copy={copy.locations} card={copy.locationCard} />

      {/* Explore Your Future — stream grid */}
      <StreamGrid fields={fields} copy={copy.streams} />

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
                active={streamTabs[0] ?? ""}
                hrefFor={(stream) => `/${slugOfStream.get(stream)}/colleges`}
              />
            )}
            {bandRows.length > 3 ? (
              <CollegeSlider
                colleges={bandRows}
                label={collection.heading || collection.title}
                buttonLabel={copy.collegeCard.buttonLabel}
              />
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {bandRows.map((college) => (
                  <TopCollegeCard key={college.slug} college={college} buttonLabel={copy.collegeCard.buttonLabel} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <ViewAllButton href={`/colleges/${collection.slug}`}>{copy.collegeCard.viewAllLabel}</ViewAllButton>
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
            active={streamTabs[0] ?? ""}
            hrefFor={(stream) => `/${slugOfStream.get(stream)}/exams`}
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topExams.map((exam) => (
              <TopExamCard key={exam.slug} exam={exam} labels={copy.examCard} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <ViewAllButton href="/exams">{copy.examCard.viewAllLabel}</ViewAllButton>
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
              active={streamTabs[0] ?? ""}
              hrefFor={(stream) => `/${slugOfStream.get(stream)}/careers`}
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
