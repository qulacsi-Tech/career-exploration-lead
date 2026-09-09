"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * The ambient ribbon layer, shared by every band on the homepage.
 *
 * Each section renders one `segment` of the same continuous strands. The x
 * waypoints below are read as a chain: segment n draws from `WAYPOINTS[n]` to
 * `WAYPOINTS[n + 1]`, so a strand leaves the bottom of one section at exactly
 * the x the next section picks it up. Control points at both ends are vertical,
 * which keeps the tangent vertical at every join — no visible kink where two
 * sections meet, whatever their heights.
 *
 * Indexes wrap, so adding bands never runs the chain off the end.
 */
const WAYPOINTS = {
  left: [110, 300, 80, 360, 130, 330, 90, 290, 120, 340, 100, 310],
  right: [1330, 1120, 1380, 1060, 1320, 1100, 1360, 1140, 1300, 1120, 1350, 1090],
  mid: [900, 620, 980, 560, 900, 640, 940, 600, 880, 660, 920, 580],
};

/** Vertical-tangent cubic: enters and leaves the viewBox straight down. */
function strandPath(from: number, to: number) {
  return `M ${from} -40 C ${from} 320, ${to} 600, ${to} 940`;
}

function at(list: number[], i: number) {
  return list[((i % list.length) + list.length) % list.length];
}

export function FlowRibbons({
  segment,
  intensity = "soft",
  tone = "light",
}: {
  /** Position in the chain. Consecutive sections must pass consecutive values. */
  segment: number;
  /** `bold` is for feature bands; `soft` sits quietly behind dense content. */
  intensity?: "soft" | "bold";
  /** `dark` inverts the palette for sections on a brand-coloured ground. */
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const pathLength = useTransform(scrollYProgress, [0.05, 0.8], [0.05, 1]);
  const drift = useTransform(scrollYProgress, [0, 1], [50, -90]);

  const scale = intensity === "bold" ? 1 : 0.62;
  const warm = tone === "dark" ? "#ffffff" : "var(--color-brand)";
  const cool = tone === "dark" ? "#ffe8c9" : "#2f8f7a";

  const strands = [
    {
      d: strandPath(at(WAYPOINTS.left, segment), at(WAYPOINTS.left, segment + 1)),
      color: cool,
      w: 120,
      body: 0.34 * scale,
    },
    {
      d: strandPath(at(WAYPOINTS.right, segment), at(WAYPOINTS.right, segment + 1)),
      color: warm,
      w: 130,
      body: 0.38 * scale,
    },
    {
      d: strandPath(at(WAYPOINTS.mid, segment), at(WAYPOINTS.mid, segment + 1)),
      color: warm,
      w: 80,
      body: 0.16 * scale,
    },
  ];

  // Filter ids must be unique per instance or every section shares the first.
  const uid = `flow-${segment}-${tone}-${intensity}`;

  return (
    <motion.div
      ref={ref}
      style={{ y: drift }}
      className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id={`${uid}-soft`} x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id={`${uid}-edge`} x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {strands.map((strand, i) => (
          <g key={i}>
            <motion.path
              d={strand.d}
              stroke={strand.color}
              strokeWidth={strand.w}
              strokeLinecap="round"
              filter={`url(#${uid}-soft)`}
              initial={{ strokeOpacity: strand.body }}
              animate={{ strokeOpacity: [strand.body, strand.body * 0.55, strand.body] }}
              transition={{ duration: 8 + i * 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d={strand.d}
              stroke={strand.color}
              strokeWidth="1.5"
              strokeOpacity={0.45 * (intensity === "bold" ? 1 : 0.7)}
              strokeLinecap="round"
              filter={`url(#${uid}-edge)`}
              style={{ pathLength }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}
