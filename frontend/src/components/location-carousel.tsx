"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { MapPin, Building2, ArrowUpRight, ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

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

/**
 * Where each card flies in from when its turn comes. Fixed per position rather
 * than randomised, so server and client agree and the choreography repeats
 * identically on every pass through the deck.
 */
const ENTRY_VECTORS = [
  { x: 0, y: 1 }, // up from the bottom
  { x: 1, y: 0.3 }, // in from the right
  { x: 0, y: -1 }, // down from the top
  { x: -1, y: 0.2 }, // in from the left
  { x: 0.6, y: 1 }, // up from the bottom-right
  { x: -0.8, y: -0.75 }, // down from the top-left
];

const X_THROW = 900;
const Y_THROW = 620;

/** How long a destination holds the stage before the deck advances. */
const DWELL = 4500;

/**
 * Destination hubs, dealt as a card deck inside one full-width frame.
 *
 * The deck used to be scroll-driven: the section reserved several screens of
 * track and pinned a sticky stage, so a visitor had to scroll the whole deck
 * before the page moved on. It now runs on a timer instead — the section is an
 * ordinary block in the flow, the page scrolls past at its own pace, and the
 * cards advance by themselves. The entry choreography is unchanged: each card
 * flies in from its own direction, locks in the centre, then settles back as
 * the next lands on top.
 *
 * It pauses on hover, so reading a card never fights the rotation, and stops
 * altogether while the section is off screen.
 */
export function LocationCarousel({ locations }: { locations: Location[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  // No `once`: the timer stops when the frame is scrolled away.
  const inView = useInView(sectionRef, { amount: 0.35 });
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);

  const total = locations.length;
  const running = playing && !hovered && inView && !reduceMotion && total > 1;

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + total) % total),
    [total]
  );

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % total), DWELL);
    return () => clearTimeout(timer);
  }, [active, running, total]);

  const current = locations[active];

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-bg py-16 lg:py-20">

      {/* 90% of the viewport, with a ceiling so the card does not stretch
          past a readable width on a very wide screen. */}
      <div className="relative z-10 mx-auto w-[90%] max-w-[1500px]">
        <div
          className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/50 shadow-[0_40px_110px_-50px_rgba(28,33,40,0.5)] backdrop-blur-2xl"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Glass tells: a lit top edge and a sheen crossing on a loop */}
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-20 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-120%", "520%"] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
          />

          {/* Top rail */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-5 sm:px-10">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
                Destination hubs
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Where Ambition Meets <span className="italic text-brand">Opportunity</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {locations.map((loc, i) => (
                  <button
                    key={loc.slug}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show ${loc.name}`}
                    aria-current={i === active}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === active ? "w-8 bg-brand" : "w-4 bg-line hover:bg-brand/40"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous destination"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next destination"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-pressed={!playing}
                aria-label={playing ? "Pause the deck" : "Play the deck"}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Stage. Clipped, so a card in flight is masked at the frame edge
              and never spills into the rest of the page. */}
          <div className="relative h-[420px] overflow-hidden p-4 sm:h-[520px] sm:p-6">
            {locations.map((loc, index) => (
              <DeckCard
                key={loc.slug}
                location={loc}
                index={index}
                active={active}
                reduceMotion={!!reduceMotion}
              />
            ))}
          </div>

          {/* Bottom rail: where you are in the deck */}
          <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4 sm:px-10">
            <span className="font-display text-sm font-semibold text-ink">{current?.name}</span>
            <span className="text-[11px] tabular-nums tracking-[0.16em] text-ink-faint">
              {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One card in the deck: off stage in its own direction, centred while it is
 * active, then receding into the stack once the next one lands.
 */
function DeckCard({
  location,
  index,
  active,
  reduceMotion,
}: {
  location: Location;
  index: number;
  active: number;
  reduceMotion: boolean;
}) {
  const meta = locationMeta[location.slug] || {
    tag: "Educational Hub",
    description: "Premier universities, high placement records & vibrant campus life",
    avgPkg: "₹7.5 - 20 LPA",
    highlight: "Top Academic Ecosystem",
  };

  const offset = index - active;
  const depth = Math.abs(offset);
  const vector = ENTRY_VECTORS[index % ENTRY_VECTORS.length];

  const state =
    offset === 0
      ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
      : offset < 0
        ? // Already seen: recede into the deck behind the active card.
          { x: 0, y: -depth * 16, rotate: 0, scale: 1 - depth * 0.04, opacity: depth > 2 ? 0 : 0.5 }
        : // Still to come: waiting off stage, tilted away from its direction.
          {
            x: vector.x * X_THROW,
            y: vector.y * Y_THROW,
            rotate: vector.x * -4 + vector.y * 1.5,
            scale: 0.94,
            opacity: 0,
          };

  return (
    <motion.div
      className="absolute inset-4 sm:inset-6"
      initial={false}
      animate={reduceMotion ? { x: 0, y: 0, opacity: offset === 0 ? 1 : 0 } : state}
      transition={{ type: "spring", stiffness: 95, damping: 19 }}
      style={{ zIndex: offset === 0 ? 30 : 20 - depth }}
      aria-hidden={offset !== 0}
    >
      <Link
        href={`/location/${location.slug}`}
        tabIndex={offset === 0 ? 0 : -1}
        className="group relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[28px] border border-white/70 shadow-[0_30px_70px_-25px_rgba(28,33,40,0.55)]"
      >
        {/* City photography */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px]">
          <Image
            src={`/images/locations/${location.slug}.jpg`}
            alt={`${location.name} campus destination`}
            fill
            sizes="(max-width: 1024px) 90vw, 1400px"
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

        {/* Cards buried in the deck recede into the paper */}
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-[28px] bg-bg transition-opacity duration-500"
          style={{ opacity: offset < 0 ? Math.min(0.55, depth * 0.25) : 0 }}
        />
      </Link>
    </motion.div>
  );
}
