"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";

/**
 * The motion vocabulary for the college page.
 *
 * Three pieces, deliberately small: `Reveal` (one block enters), `RevealGroup`
 * / `RevealItem` (a list enters in sequence) and `CountUp` (a number counts to
 * its value). Everything on the page animates through one of them, so the
 * timing is consistent down the whole scroll rather than each section
 * inventing its own easing.
 *
 * All three are `once: true`. A page this long would otherwise re-animate
 * every time the visitor scrolled back up to re-read the fees table, which
 * reads as the page glitching rather than as motion.
 *
 * Reduced motion is honoured by rendering the *finished* state immediately —
 * not by shortening the duration. Someone who asked for no motion gets none,
 * and still sees every section, because the content is in the DOM either way.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared with RevealItem so a group's children match a standalone Reveal. */
const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

export function Reveal({
  children,
  className = "",
  delay = 0,
  /** How far into the viewport the block must be before it starts. */
  amount = 0.25,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </Tag>
  );
}

/**
 * A container whose children stagger in.
 *
 * The stagger lives on the parent rather than as a delay per child so a list
 * of unknown length stays in rhythm — a six-row grid and a two-row grid both
 * finish in proportion instead of the long one trailing off.
 */
export function RevealGroup({
  children,
  className = "",
  stagger = 0.08,
  amount = 0.2,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  as?: "div" | "ul" | "section";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Tag>
  );
}

/** One child of a RevealGroup. Inherits the parent's stagger. */
export function RevealItem({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "tr";
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag className={className} variants={rise}>
      {children}
    </Tag>
  );
}

/**
 * A number that counts up to its value once it is on screen.
 *
 * Driven by rAF against elapsed time rather than a frame counter, so it lasts
 * the same 1.1s on a 60Hz and a 120Hz display. The easing is the same
 * out-expo curve as the reveals, which is what makes the count feel like part
 * of the block arriving rather than a separate widget.
 *
 * `decimals` keeps a rating at 4.3 rather than 4; `prefix`/`suffix` carry the
 * currency or the unit so the whole string is one element and cannot wrap
 * between the number and its symbol.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1100,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);

  /* Reduced motion never enters the animation at all — the final value is
     derived here rather than pushed through setState from the effect, which
     would be a render just to land on a number we already have. */
  const display = reduceMotion ? value : shown;

  useEffect(() => {
    if (!inView || reduceMotion) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Out-expo: fast off the mark, settles onto the final value.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {/*
        The accessible value is the final one from the first render: a screen
        reader announcing 0, then 1, then 4.3 as the count runs is noise. The
        animated digits are hidden from it.
      */}
      <span className="sr-only">
        {prefix}
        {value.toFixed(decimals)}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        {display.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}
