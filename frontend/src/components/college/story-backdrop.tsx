"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * The scroll-driven shape field that runs behind a run of story steps.
 *
 * Its whole job is to make several sections read as one continuous surface
 * rather than as stacked boxes: the same blooms, grid and rings pass behind
 * every step, drifting at their own rates, so scrolling from Overview into
 * Cutoffs feels like moving across one scene instead of arriving at the next
 * card.
 *
 * ## The rates are the point
 *
 * Five layers, five speeds. The blooms travel furthest (they read as closest
 * to the viewer), the dotted grid barely moves (it reads as the far wall), and
 * the rings rotate rather than translate so there is some motion that is not
 * vertical. If they all moved together the field would read as one flat image
 * sliding, which is the thing parallax exists to avoid.
 *
 * ## Constraints it has to respect
 *
 * - **Nothing here is content.** The layer is `aria-hidden` and
 *   `pointer-events-none`; every shape is decorative, so a screen reader and a
 *   mouse both pass straight through to the sections on top.
 * - **It must not widen the page.** Shapes are pulled outside the container on
 *   purpose, so the parent carries `overflow-hidden` — without it the blurred
 *   blooms add horizontal scroll at phone width.
 * - **Reduced motion keeps the shapes, drops the drift.** The field is what
 *   ties the sections together; removing it would leave those sections looking
 *   unfinished rather than calm.
 */
export function StoryBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  /* Measured across the layer's full visible life — it spans every step, so
     this is one progress value for the whole run rather than per section. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const bloomY = useTransform(scrollYProgress, [0, 1], ["-8%", "22%"]);
  const bloomAltY = useTransform(scrollYProgress, [0, 1], ["14%", "-14%"]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["-3%", "6%"]);
  const ringSpin = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const ringSpinBack = useTransform(scrollYProgress, [0, 1], [25, -95]);
  const squareY = useTransform(scrollYProgress, [0, 1], ["10%", "-18%"]);

  /** Applied to every layer, so reduced motion is one branch rather than six. */
  const drift = (style: Record<string, unknown>) => (reduceMotion ? undefined : style);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Far wall: a dotted grid, masked to a soft oval so it has no visible
          edges. `background-image` rather than an SVG — one repeating
          radial-gradient is cheaper than a few hundred <circle> nodes. */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[140%] opacity-[0.55]"
        style={drift({ y: gridY })}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, var(--color-line) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse 70% 55% at 50% 40%, #000 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 40%, #000 30%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* Blooms. Sized in vw-ish fixed pixels and pulled off both edges so the
          colour arrives from outside the reading column. */}
      <motion.div
        className="absolute -left-48 top-[6%] h-[560px] w-[560px] rounded-full bg-brand/10 blur-[130px]"
        style={drift({ y: bloomY })}
      />
      <motion.div
        className="absolute -right-56 top-[38%] h-[620px] w-[620px] rounded-full bg-gold/12 blur-[140px]"
        style={drift({ y: bloomAltY })}
      />
      <motion.div
        className="absolute -left-32 bottom-[4%] h-[440px] w-[440px] rounded-full bg-brand/8 blur-[120px]"
        style={drift({ y: bloomAltY })}
      />

      {/* Outline rings: motion that is not vertical, so the field does not read
          as one sheet sliding upward. */}
      <motion.div
        className="absolute -right-24 top-[12%] h-72 w-72 rounded-full border border-brand/15"
        style={drift({ rotate: ringSpin })}
      >
        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/40" />
      </motion.div>
      <motion.div
        className="absolute -left-20 top-[52%] h-96 w-96 rounded-full border border-dashed border-gold/25"
        style={drift({ rotate: ringSpinBack })}
      >
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/50" />
      </motion.div>

      {/* A rotated rounded square — the one straight-edged shape, so the field
          is not exclusively circles. */}
      <motion.div
        className="absolute right-[8%] bottom-[14%] h-40 w-40 rotate-12 rounded-3xl border border-brand/12"
        style={drift({ y: squareY })}
      />

    </div>
  );
}
