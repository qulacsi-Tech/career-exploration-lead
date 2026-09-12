"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { LeafGlow } from "@/components/ui/leaf-glow";
import {
  Briefcase,
  Cpu,
  Stethoscope,
  Palette,
  BarChart3,
  Scale,
  ArrowUpRight,
  Award,
  BookOpen,
  GraduationCap,
  Pause,
  Play,
  Shuffle,
} from "lucide-react";

interface StreamItem {
  slug: string;
  name: string;
  count: number;
}

const streamEnhancements: Record<
  string,
  { icon: React.ElementType; tagline: string; salaryRange: string; badge: string }
> = {
  management: {
    icon: Briefcase,
    tagline: "Leadership & Global Enterprise",
    salaryRange: "₹9 - 32 LPA",
    badge: "Top Placement ROI",
  },
  engineering: {
    icon: Cpu,
    tagline: "Next-Gen Tech, AI & Systems",
    salaryRange: "₹8 - 38 LPA",
    badge: "Highest Demand",
  },
  medical: {
    icon: Stethoscope,
    tagline: "Clinical Healthcare & Biotech",
    salaryRange: "₹10 - 45 LPA",
    badge: "Vital Impact",
  },
  arts: {
    icon: Palette,
    tagline: "Media, Design & Humanities",
    salaryRange: "₹6 - 20 LPA",
    badge: "Fastest Emerging",
  },
  commerce: {
    icon: BarChart3,
    tagline: "Banking, Markets & Capital",
    salaryRange: "₹7 - 24 LPA",
    badge: "Market Drivers",
  },
  law: {
    icon: Scale,
    tagline: "Litigation, IP & Policy",
    salaryRange: "₹8 - 26 LPA",
    badge: "High Prestige",
  },
};

/**
 * One unhurried round: each disc spins up like a wheel, one after another;
 * once the last has spun, they turn over in the same order like coins.
 */
const SPIN_START = 400; // ms before the first disc starts spinning
const SPIN_STEP = 380; // ms between one disc spinning up and the next
const SPIN_TURNS = 2; // full rotations per spin
const FLIP_GAP = 600; // ms of stillness between the last spin and the first flip
const FLIP_STEP = 450; // ms between coin flips
const CYCLE = 8000; // ms — a new shuffle every eight seconds

/**
 * One disc in the play.
 *
 * Spins in place like a wheel when its turn comes, then flips like a coin to
 * show its face. Clicking a face-down disc flips it early.
 *
 * Both faces are direct children of the `preserve-3d` element — anything
 * wrapped around them flattens its own 3D context and the hidden face shows
 * through mirrored.
 *
 * `spins` counts how many wheel turns this disc has been through since mount,
 * so the rotation always winds forward and never rewinds between rounds.
 */
function StreamDisc({
  stream,
  index,
  total,
  spins,
  revealed,
  onReveal,
}: {
  stream: StreamItem;
  index: number;
  total: number;
  spins: number;
  revealed: boolean;
  onReveal: () => void;
}) {
  const data = streamEnhancements[stream.slug] || {
    icon: BookOpen,
    tagline: "Specialized Degree Programs",
    salaryRange: "₹6 - 22 LPA",
    badge: "Verified Curriculum",
  };
  const Icon = data.icon;

  return (
    <motion.div
      className="mx-auto w-full max-w-[190px] [perspective:1200px]"
      initial={false}
      // The wheel: spin the whole disc in its slot, easing out like a
      // roulette wheel coming to rest.
      animate={{ rotate: spins * SPIN_TURNS * 360, scale: 1 }}
      transition={{ rotate: { duration: 1.5, ease: [0.16, 0.9, 0.25, 1] } }}
    >
      <motion.div
        className="relative aspect-square w-full [transform-style:preserve-3d]"
        // The coin: a slow half turn, lifting slightly as it goes over.
        animate={{ rotateY: revealed ? 180 : 0, scale: revealed ? [1, 1.07, 1] : 1 }}
        transition={{
          rotateY: { duration: 0.95, ease: [0.33, 0, 0.2, 1] },
          scale: { duration: 0.95, times: [0, 0.5, 1] },
        }}
      >
        {/* Face down */}
        <button
          type="button"
          onClick={onReveal}
          tabIndex={revealed ? -1 : 0}
          aria-label={`Turn over disc ${index + 1} of ${total}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-full border border-brand/25 bg-gradient-to-br from-brand-soft via-surface to-brand-soft shadow-[0_18px_40px_-24px_rgba(28,33,40,0.55)] [backface-visibility:hidden]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-brand) 20%, transparent) 1px, transparent 0)",
            backgroundSize: "12px 12px",
          }}
        >
          <span className="absolute inset-2.5 rounded-full border border-dashed border-brand/25" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-brand/30 bg-surface/90 text-brand">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-ink/70">
            {String(index + 1).padStart(2, "0")}
          </span>
        </button>

        {/* Face up */}
        <Link
          href={`/${stream.slug}/colleges`}
          tabIndex={revealed ? 0 : -1}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-full border border-white/70 bg-white/60 px-6 text-center shadow-[0_22px_50px_-28px_rgba(28,33,40,0.55)] backdrop-blur-xl transition-colors duration-300 hover:border-brand/50 hover:bg-white/80 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
            <Icon className="h-5 w-5" />
          </span>

          <h3 className="mt-1 font-display text-lg font-bold leading-tight text-ink transition-colors group-hover:text-brand">
            {stream.name}
          </h3>

          <span className="text-[11px] font-semibold text-brand">
            {stream.count.toLocaleString()} Colleges
          </span>

          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Explore <ArrowUpRight className="h-3 w-3" />
          </span>
        </Link>
      </motion.div>

      {/* Caption sits outside the disc so the circle stays clean */}
      <p className="mt-3 text-center text-[11px] leading-snug text-ink-soft">
        {revealed ? data.tagline : " "}
      </p>
    </motion.div>
  );
}

export function StoryStreamExplorer({ streams }: { streams: StreamItem[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  // No `once` — the loop stops paying for animation frames once scrolled past.
  const inView = useInView(sectionRef, { amount: 0.3 });
  const reduceMotion = useReducedMotion();

  const [playing, setPlaying] = useState(true);
  const [round, setRound] = useState(0);
  // How many wheel turns each disc has completed, by position.
  const [spins, setSpins] = useState<number[]>(() => streams.map(() => 0));
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    // Reduced motion: no wheel, no coin — every disc is simply face-up.
    if (reduceMotion) {
      setRevealedCount(streams.length);
      return;
    }

    if (!inView || !playing) {
      // Paused or off screen: settle on the fully revealed ring so the section
      // is never left mid-shuffle and unreadable.
      setRevealedCount(streams.length);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    // Turn every disc face-down again, then spin them up one at a time.
    setRevealedCount(0);

    for (let i = 0; i < streams.length; i++) {
      timers.push(
        setTimeout(
          () => setSpins((prev) => prev.map((n, j) => (j === i ? n + 1 : n))),
          SPIN_START + i * SPIN_STEP
        )
      );
    }

    // Coins turn over in the same order, once the wheel has settled.
    const firstFlip = SPIN_START + streams.length * SPIN_STEP + FLIP_GAP;
    for (let i = 0; i < streams.length; i++) {
      timers.push(setTimeout(() => setRevealedCount(i + 1), firstFlip + i * FLIP_STEP));
    }

    timers.push(setTimeout(() => setRound((r) => r + 1), CYCLE));

    return () => timers.forEach(clearTimeout);
  }, [inView, playing, reduceMotion, streams.length, round]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-bg-alt py-20 lg:py-28">
      <LeafGlow variant={1} intensity="bold" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-[3rem]"
          >
            Chart Your Discipline. <br />
            <span className="italic text-brand">Shape Your Tomorrow.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base text-ink-soft"
          >
            Six disciplines dealt from every direction — turn one over to open its colleges.
          </motion.p>
        </div>

        {/* Transport controls */}
        <div className="mx-auto mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause shuffle" : "Resume shuffle"}
          </button>

          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              setRound((r) => r + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-xl transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle now
          </button>
        </div>

        {/* The play */}
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {streams.map((stream, idx) => (
            <StreamDisc
              key={stream.slug}
              stream={stream}
              index={idx}
              total={streams.length}
              spins={spins[idx] ?? 0}
              revealed={idx < revealedCount}
              onReveal={() => setRevealedCount((c) => Math.max(c, idx + 1))}
            />
          ))}
        </div>

        {/* Closing stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/55 p-6 shadow-sm backdrop-blur-xl sm:flex-row sm:px-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-ink">
                Unsure which stream matches your aptitude?
              </p>
              <p className="text-xs text-ink-soft">
                Explore comprehensive curriculum guides and connect with educational counselors.
              </p>
            </div>
          </div>

          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <span>Browse All Courses</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
