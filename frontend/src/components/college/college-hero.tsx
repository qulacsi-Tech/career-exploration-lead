"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Download, MapPin, Star } from "lucide-react";
import { CountUp } from "@/components/college/reveal";

/**
 * The cinematic opening of a college page.
 *
 * The old header was a logo, a name and two buttons on white — correct, and
 * completely forgettable. This is the same information set as a full-bleed
 * scene: the campus photograph fills the viewport, the name is set over it,
 * and the three numbers a visitor actually came for (rank, rating, fees) float
 * in front on glass panels.
 *
 * ## The parallax
 *
 * Scroll drives two things at different rates: the photograph drifts down
 * slower than the page (y 0 to 14%) while the copy drifts *up* faster than it
 * (y 0 to -60px) and fades. That difference is the whole effect — the text
 * appears to peel off the image as the page leaves. The scrim darkens on the
 * way out so the section below starts against a settled ground rather than a
 * bright photograph.
 *
 * `offset: ["start start", "end start"]` measures from the hero filling the
 * viewport to its bottom edge reaching the top, which is exactly the window
 * where the hero is visible. Transforms outside that range are clamped, so
 * nothing keeps moving after it has left.
 *
 * ## Why props rather than the College object
 *
 * This is a client component, so everything passed to it is serialized into
 * the RSC payload. A College carries its reviews, courses and cutoffs; the
 * hero needs eleven fields. Naming them keeps the payload to those eleven.
 */

type HeroStat = {
  label: string;
  /** Counted up when numeric, passed straight through when not. */
  value: number | string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  note: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function CollegeHero({
  name,
  city,
  state,
  ownership,
  established,
  approvals,
  rank,
  authority,
  rating,
  reviewCount,
  feesRange,
  photo,
}: {
  name: string;
  city: string;
  state: string;
  ownership: string;
  established: number;
  approvals: string[];
  rank: number;
  authority: string;
  rating: number;
  reviewCount: number;
  feesRange: string;
  photo: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const copyFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  /*
    The scrim's opacity ramps as the hero scrolls away — but the value that
    matters is the one at rest, because that is when the hero is fully in view
    and everything on it is being read.

    It used to start at 0.55, which multiplied the gradient below
    (`black/70 → black/45 → black/80`) down to roughly 39% / 25% / 44% actual
    darkness. The headline and the meta line sit in that middle band, so on a
    bright campus photo they were reading white-on-white. Starting at 0.80
    keeps the same scroll gesture while putting the floor somewhere the type
    survives a pale sky.
  */
  const scrimFade = useTransform(scrollYProgress, [0, 1], [0.8, 0.92]);

  const stats: HeroStat[] = [
    {
      label: authority,
      value: rank,
      prefix: "#",
      note: `Ranked ${rank} among ${ownership.toLowerCase()} institutions this year.`,
    },
    {
      label: "Student rating",
      value: rating,
      decimals: 1,
      suffix: " / 5",
      note: `Averaged across ${reviewCount.toLocaleString("en-IN")} verified student reviews.`,
    },
    {
      label: "Total fees",
      value: feesRange,
      note: "Full programme fee range across every course on offer.",
    },
  ];

  /* The headline reveals a word at a time. Split here rather than into
     separate elements, so it is still one <h1> to a screen reader. */
  const words = name.split(" ");

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-brand-ink lg:min-h-[88vh]"
    >
      {/* The photograph. Held at scale 1.12 so the parallax translate can never
          pull an edge into frame. */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={reduceMotion ? undefined : { y: imageY, scale: 1.12 }}
      >
        <Image
          src={photo}
          alt={`${name} campus`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      {/* Two scrims. The vertical one carries the type; the brand wash ties the
          photograph to the palette, so the hero belongs to the site rather than
          to whatever was shot that day. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/45 to-black/80"
        style={reduceMotion ? undefined : { opacity: scrimFade }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-ink/90 via-brand-ink/40 to-transparent"
      />

      <motion.div
        className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
        style={reduceMotion ? undefined : { y: copyY, opacity: copyFade }}
      >
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Copy */}
          <div className="max-w-2xl">
            <motion.nav
              aria-label="Breadcrumb"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/85"
            >
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <span aria-hidden>/</span>
              <Link href="/colleges" className="transition hover:text-white">
                Colleges
              </Link>
              <span aria-hidden>/</span>
              <Link
                href={`/location/${city.toLowerCase()}`}
                className="transition hover:text-white"
              >
                {city}
              </Link>
              <span aria-hidden>/</span>
              <span className="text-white/90">{name}</span>
            </motion.nav>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {words.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  className="mr-[0.25em] inline-block"
                  initial={reduceMotion ? false : { opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.65, delay: 0.1 + i * 0.07, ease: EASE }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* The gold rule under the name — the reference layout's accent.
                Drawn from the left rather than faded in, so it reads as
                underlining the headline. */}
            <motion.div
              aria-hidden
              className="mt-5 h-1 max-w-[220px] origin-left rounded-full bg-gold"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.1 + words.length * 0.07, ease: EASE }}
            />

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gold" />
                  {city}, {state}
                </span>
                <span aria-hidden className="text-white/30">
                  &bull;
                </span>
                <span>{ownership}</span>
                <span aria-hidden className="text-white/30">
                  &bull;
                </span>
                <span>Established {established}</span>
                <span aria-hidden className="text-white/30">
                  &bull;
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-gold">
                  <Star className="h-4 w-4 fill-current" />
                  {rating.toFixed(1)}
                </span>
              </p>

              <ul className="mt-5 flex flex-wrap gap-2">
                {approvals.map((approval) => (
                  <li
                    key={approval}
                    className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm"
                  >
                    {approval}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/enquiry"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-bold text-brand-ink shadow-lg shadow-black/25 transition hover:brightness-110"
                >
                  Apply Now
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/enquiry"
                  className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-brand-ink"
                >
                  <Download className="h-4 w-4" />
                  Download Brochure
                </Link>
              </div>
            </motion.div>
          </div>

          {/*
            The floating stat panels. A column on large screens, where they sit
            in the photograph's emptier right third; a plain row under the copy
            below that — offsetting them at phone width would just stack three
            translated cards on top of each other.
          */}
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((stat, i) => (
              <motion.li
                key={stat.label}
                initial={reduceMotion ? false : { opacity: 0, x: 40, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.5 + i * 0.12, ease: EASE }}
                /* Middle card steps out of the column — the reference's
                   scattered cards, but on a rule, so it reads as arrangement
                   rather than as drift. */
                /*
                  Backed with ink rather than white.

                  These panels sit in the photograph's right third, which is
                  exactly where the brand wash below fades to fully transparent
                  — so `bg-white/12` left a 12% white film and a blur as the
                  only thing between white type and whatever was shot that day.
                  A dark backing gives the gold label and the white figure a
                  known ground instead of a hopeful one.
                */
                className={`rounded-2xl border border-white/20 bg-ink/45 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
                  i === 1 ? "lg:-translate-x-8" : ""
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold text-white">
                  {typeof stat.value === "number" ? (
                    <CountUp
                      value={stat.value}
                      decimals={stat.decimals}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/85">{stat.note}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Scroll cue. Hidden from assistive tech: it says nothing the page does
          not, and the loop would be announced as a state change. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
        style={reduceMotion ? undefined : { opacity: copyFade }}
      >
        <motion.span
          className="flex h-10 w-6 items-start justify-center rounded-full border border-white/40 p-1.5"
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="block h-1.5 w-1 rounded-full bg-white/80" />
        </motion.span>
      </motion.div>
    </section>
  );
}
