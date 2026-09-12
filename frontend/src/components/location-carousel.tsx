"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { LeafGlow } from "@/components/ui/leaf-glow";
import { MapPin, Building2, ArrowUpRight, ArrowDown } from "lucide-react";

interface Location {
  slug: string;
  name: string;
  collegeCount: number;
}

const locationMeta: Record<
  string,
  { tag: string; description: string; avgPkg: string; highlight: string }
> = {
  bangalore: {
    tag: "Silicon Valley of India",
    description: "Global epicenter for IT, Artificial Intelligence, Product Startups & Tech Giants.",
    avgPkg: "₹8.5 - 24 LPA",
    highlight: "Top Startup Ecosystem",
  },
  hyderabad: {
    tag: "Cyber City & Biotech",
    description: "Rapidly expanding IT corridor, pharmaceutical research & Fortune 500 campuses.",
    avgPkg: "₹7.5 - 20 LPA",
    highlight: "Highest Growth Index",
  },
  pune: {
    tag: "Oxford of the East",
    description: "Academic heritage, premier automotive design, research & manufacturing hubs.",
    avgPkg: "₹7.0 - 18 LPA",
    highlight: "Student Capital",
  },
  mumbai: {
    tag: "Financial Capital",
    description: "Headquarters of India's major investment banks, consulting & media powerhouses.",
    avgPkg: "₹9.0 - 28 LPA",
    highlight: "Finance & Corporate HQ",
  },
  "delhi-ncr": {
    tag: "National Corporate Hub",
    description: "Center of policy, diplomacy, FMCG giants & fast-growing tech conglomerates.",
    avgPkg: "₹8.0 - 25 LPA",
    highlight: "Leadership & Policy Hub",
  },
  chennai: {
    tag: "Industrial & IT Powerhouse",
    description: "Renowned research institutions, health-tech revolution & automotive manufacturing.",
    avgPkg: "₹6.8 - 18 LPA",
    highlight: "Core Tech & Research",
  },
};

/** Scroll span reserved for the cards; the tail lets the stage unpin calmly. */
const TRACK_END = 0.9;

/**
 * Frosted plate the deck sits on. It frames the banner and blurs the moving
 * ribbons travelling behind it, so the animation reads through the glass.
 */
function GlassFrame() {
  return (
    <div className="pointer-events-none absolute -inset-3 z-0 overflow-hidden rounded-[40px] border border-white/60 bg-white/40 shadow-[0_40px_100px_-45px_rgba(28,33,40,0.45)] backdrop-blur-2xl sm:-inset-6">
      {/* Sheen sweep */}
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
        animate={{ x: ["-120%", "420%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
      />
      {/* Top edge highlight */}
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
    </div>
  );
}

/**
 * Where each banner flies in from, as a fraction of the travel distance below.
 * Fixed per position rather than randomised, so the sequence is stable across
 * renders (a random pick would differ between server and client) and every
 * visitor sees the same choreography. The list cycles if more cities are added.
 */
const ENTRY_VECTORS = [
  { x: 0, y: 0 }, // first card is already on stage
  { x: 1, y: 0.3 }, // in from the right
  { x: 0, y: -1 }, // down from the top
  { x: -1, y: 0.2 }, // in from the left
  { x: 0.55, y: 1 }, // up from the bottom-right
  { x: -0.8, y: -0.75 }, // down from the top-left
  { x: 0, y: 1 }, // straight up from the bottom
  { x: 1, y: -0.6 }, // down from the top-right
];

/** Travel distance for a full-strength entry, in px. */
const X_TRAVEL = 900;
const Y_TRAVEL = 620;

/**
 * One banner in the deck.
 *
 * Each card flies in from its own direction — right, top, left, a corner —
 * crosses the stage, and locks in the centre, then settles back as the next
 * card lands on top of it. The stage clips, so a card in flight is masked at
 * the stage edge and can never spill into the rest of the page.
 */
function DeckCard({
  location,
  index,
  total,
  progress,
  activeIndex,
}: {
  location: Location;
  index: number;
  total: number;
  progress: MotionValue<number>;
  activeIndex: number;
}) {
  const meta = locationMeta[location.slug] || {
    tag: "Educational Hub",
    description: "Premier universities, high placement records & vibrant campus life",
    avgPkg: "₹7.5 - 20 LPA",
    highlight: "Top Academic Ecosystem",
  };

  const seg = TRACK_END / total;
  const isFirst = index === 0;

  // Off stage -> half way across, edge showing -> locked in the centre.
  const offStart = isFirst ? 0 : index * seg - seg * 0.72;
  const peekAt = isFirst ? 0.0001 : index * seg - seg * 0.34;
  const lockAt = isFirst ? 0.0002 : index * seg;

  // Depth = how many cards will eventually rest on top of this one.
  const depth = total - 1 - index;
  const restY = -depth * 10;
  const restScale = 1 - depth * 0.03;

  const vector = ENTRY_VECTORS[index % ENTRY_VECTORS.length];
  const fromX = vector.x * X_TRAVEL;
  const fromY = vector.y * Y_TRAVEL;
  // Tilt away from the direction of travel, straightening as the card lands.
  const fromRotate = vector.x * -4 + vector.y * 1.5;

  const x = useTransform(
    progress,
    [offStart, peekAt, lockAt],
    isFirst ? [0, 0, 0] : [fromX, fromX * 0.42, 0]
  );

  const y = useTransform(
    progress,
    [offStart, peekAt, lockAt, 1],
    isFirst ? [0, 0, 0, restY] : [fromY, fromY * 0.42, 0, restY]
  );

  const rotate = useTransform(
    progress,
    [offStart, lockAt],
    isFirst ? [0, 0] : [fromRotate, 0]
  );

  const scale = useTransform(
    progress,
    [peekAt, lockAt, 1],
    isFirst ? [1, 1, restScale] : [0.95, 1, restScale]
  );

  const opacity = useTransform(
    progress,
    [offStart, peekAt, lockAt],
    isFirst ? [1, 1, 1] : [0, 1, 1]
  );

  // Render only the settled stack plus the single card currently rising in.
  if (index > activeIndex + 1) return null;

  const stackedBehind = Math.max(0, activeIndex - index);

  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity, zIndex: 10 + index }}
      className="absolute inset-0"
    >
      <Link
        href={`/location/${location.slug}`}
        className="group relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[32px] border border-white/70 shadow-[0_30px_70px_-25px_rgba(28,33,40,0.55)]"
      >
        {/* City photography */}
        <div className="absolute inset-0 overflow-hidden rounded-[32px]">
          <Image
            src={`/images/locations/${location.slug}.jpg`}
            alt={`${location.name} campus destination`}
            fill
            sizes="(max-width: 1024px) 92vw, 900px"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            priority={index < 2}
          />
          {/* Legibility scrim: darkest at the bottom, a soft veil up top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        {/* Top row */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5" />
              {meta.tag}
            </span>
            <span className="hidden rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/65 backdrop-blur-md sm:inline-flex">
              {meta.highlight}
            </span>
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:border-transparent group-hover:bg-white group-hover:text-black">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {/* Bottom content */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-2 text-white/55">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              {location.collegeCount}+ Ranked Institutions
            </span>
          </div>

          <h3 className="mt-2 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {location.name}
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {meta.description}
          </p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-white/45">
                Average CTC
              </span>
              <span className="text-lg font-semibold text-white">{meta.avgPkg}</span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-black">
              Explore Colleges
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Cards buried in the deck recede into the page ground */}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[32px] bg-bg transition-opacity duration-500"
          style={{ opacity: Math.min(0.6, stackedBehind * 0.26) }}
        />
      </Link>
    </motion.div>
  );
}

export function LocationCarousel({ locations }: { locations: Location[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      const idx = Math.min(
        locations.length - 1,
        Math.max(0, Math.floor((latest / TRACK_END) * locations.length))
      );
      setActiveCardIndex(idx);
    });
  }, [scrollYProgress, locations.length]);

  /**
   * Jump straight to the next banner — or, once the deck is complete, past the
   * section entirely. Mirrors the maths behind `useScroll`: progress 0 is the
   * container top at the viewport top, progress 1 is its bottom at the bottom.
   */
  const goToNext = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const trackTop = window.scrollY + rect.top;
    const trackLength = el.offsetHeight - window.innerHeight;
    const seg = TRACK_END / locations.length;

    const isLast = activeCardIndex >= locations.length - 1;
    const targetProgress = isLast ? 1 : (activeCardIndex + 1) * seg + seg * 0.05;

    window.scrollTo({
      top: trackTop + trackLength * targetProgress + (isLast ? 8 : 0),
      behavior: "smooth",
    });
  }, [activeCardIndex, locations.length]);

  const active = locations[activeCardIndex];
  const isLast = activeCardIndex >= locations.length - 1;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ minHeight: `${100 + locations.length * 60}vh` }}
    >
      {/* Sticky stage — transparent, so the page ground runs straight through */}
      <div className="sticky top-16 z-10 flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden px-4 sm:px-8">
        <LeafGlow variant={0} intensity="bold" />

        {/* Header */}
        <div className="relative z-20 mx-auto w-full max-w-3xl shrink-0 pt-8 text-center sm:pt-10">
          <h2 className="font-display text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.4rem]">
            Where Ambition Meets <span className="italic text-brand">Opportunity</span>
          </h2>

          <p className="mt-3 text-sm text-ink-soft sm:text-base">
            Six corridors where India builds its careers — one at a time.
          </p>
        </div>

        {/* Deck stage: clipped so the rising banner never touches header or rail */}
        <div className="relative z-10 min-h-0 w-full flex-1 overflow-hidden py-8">
          <div className="absolute left-1/2 top-1/2 h-[88%] w-[92%] max-w-[980px] -translate-x-1/2 -translate-y-1/2">
            <GlassFrame />
            {locations.map((loc, index) => (
              <DeckCard
                key={loc.slug}
                location={loc}
                index={index}
                total={locations.length}
                progress={scrollYProgress}
                activeIndex={activeCardIndex}
              />
            ))}
          </div>

          {/* Fade the rising banner into the stage floor */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-14 bg-gradient-to-t from-bg to-transparent" />
        </div>

        {/* Progress rail + jump control */}
        <div className="relative z-20 mx-auto w-full max-w-[980px] shrink-0 pb-7">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="block font-display text-sm font-semibold text-ink">
                {active?.name}
              </span>
              <span className="text-[11px] tabular-nums tracking-[0.16em] text-ink-faint">
                {String(activeCardIndex + 1).padStart(2, "0")} /{" "}
                {String(locations.length).padStart(2, "0")}
              </span>
            </div>

            <button
              type="button"
              onClick={goToNext}
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/70 bg-white/55 py-2 pl-4 pr-2 text-sm font-medium text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
              aria-label={
                isLast
                  ? "Skip to the next section"
                  : `Jump to ${locations[activeCardIndex + 1]?.name}`
              }
            >
              <span className="hidden sm:inline">
                {isLast ? "Next section" : locations[activeCardIndex + 1]?.name}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/70 text-ink transition-colors group-hover:border-white/40 group-hover:bg-white/20 group-hover:text-white">
                <ArrowDown className="h-4 w-4" />
              </span>
            </button>
          </div>

          <div className="mt-3 flex gap-1.5">
            {locations.map((loc, i) => (
              <span
                key={loc.slug}
                className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
                  i <= activeCardIndex ? "bg-brand" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
