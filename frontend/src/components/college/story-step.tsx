"use client";

import { ReactNode, useRef } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * One numbered step in the college's story.
 *
 * Four of these carry the page: Overview, Courses & Fees, Cutoffs, Reviews.
 * Each is a numbered node on a left rail with a line running down to the next
 * one, so a visitor reads four stages of one story rather than four headings
 * that happen to be stacked.
 *
 * ## The connector draws as you read it
 *
 * The line's `scaleY` is tied to this step's own scroll progress, measured
 * from its top reaching the middle of the viewport to its bottom reaching the
 * middle. That window is exactly the span during which the step is the thing
 * being read, so the line finishes drawing at the moment the next node comes
 * into view and the two connect seamlessly.
 *
 * The node itself is driven by `useInView`, not by scroll: it is a state
 * change (reached / not reached), not a continuous value, and springing it on
 * arrival reads as the journey ticking over.
 *
 * ## Why the rail is `lg:` only
 *
 * A 64px gutter is a sixth of a phone screen spent on decoration. Below `lg`
 * the node becomes an inline badge above the heading — same information, no
 * gutter — and the connector is dropped, since two nodes a full screen apart
 * with a line between them is just a long empty stripe.
 */
export function StoryStep({
  index,
  total,
  label,
  children,
  id,
  className = "",
  /** Last step, or one the page breaks away from — no line drawn downward. */
  connector = true,
}: {
  index: number;
  total: number;
  label: string;
  children: ReactNode;
  id?: string;
  className?: string;
  connector?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const nodeRef = useRef<HTMLDivElement>(null);
  const reached = useInView(nodeRef, { once: true, amount: 0.8 });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const step = String(index).padStart(2, "0");

  return (
    <section
      ref={ref}
      id={id}
      className={`relative grid gap-y-6 lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-x-10 ${className}`}
    >
      {/* Rail */}
      <div className="hidden lg:flex lg:flex-col lg:items-center">
        <motion.div
          ref={nodeRef}
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={reached ? { scale: 1, opacity: 1 } : undefined}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-display text-lg font-extrabold transition-colors duration-500 ${
            reached
              ? "border-brand bg-brand text-white shadow-lg shadow-brand/25"
              : "border-line bg-surface text-ink-faint"
          }`}
        >
          {step}
          {/* A halo that only exists once the node is reached, so arriving at a
              step has a visible beat rather than the number just being there. */}
          {reached && !reduceMotion && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl border border-brand"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          )}
        </motion.div>

        {connector && (
          <div className="relative mt-4 w-px flex-1 bg-line-soft">
            <motion.div
              className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-brand via-brand/60 to-gold"
              style={{ scaleY: reduceMotion ? 1 : lineScale }}
            />
          </div>
        )}
      </div>

      {/* Content. The mobile badge lives here rather than in the rail so it
          sits in the reading order right before the heading. */}
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-display text-sm font-extrabold text-white">
            {step}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
            {label}
          </span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>

        {/* Screen readers get the step position once, here, rather than from a
            decorative numeral they would otherwise hear out of context. */}
        <span className="sr-only">
          Step {index} of {total}: {label}
        </span>

        {children}
      </div>
    </section>
  );
}
