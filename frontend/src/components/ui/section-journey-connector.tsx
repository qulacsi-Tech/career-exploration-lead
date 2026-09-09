"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Zap, Sparkles } from "lucide-react";

interface SectionJourneyConnectorProps {
  fromBadge?: string;
  toBadge?: string;
  title?: string;
}

/**
 * Bridge between two story steps.
 *
 * Laid out as a single vertical spine — badge, rope, waypoint, rope, badge —
 * stacked in normal flow so no piece is absolutely positioned over another.
 */
export function SectionJourneyConnector({
  fromBadge = "Step 01: Regional Hubs",
  toBadge = "Step 02: Academic Streams",
  title = "Location Synced to Academic Streams",
}: SectionJourneyConnectorProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  const pathLength = useTransform(scrollYProgress, [0, 0.85], [0.15, 1]);
  const pulseScale = useTransform(scrollYProgress, [0, 0.6, 1], [0.94, 1.04, 1]);

  const ropeD = "M 60 0 C 60 30, 60 50, 60 80";

  const Rope = () => (
    <svg
      className="h-16 w-[120px]"
      viewBox="0 0 120 80"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={ropeD} stroke="var(--color-brand)" strokeOpacity="0.14" strokeWidth="14" strokeLinecap="round" />
      <motion.path
        d={ropeD}
        stroke="url(#connector-grad)"
        strokeWidth="7"
        strokeLinecap="round"
        filter="url(#connector-bloom)"
        style={{ pathLength }}
      />
      <motion.path
        d={ropeD}
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ pathLength }}
      />
    </svg>
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-gradient-to-b from-bg to-bg-alt py-10"
    >
      {/* Shared gradient / filter defs */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <linearGradient id="connector-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.85" />
          </linearGradient>
          <filter id="connector-bloom" x="-60%" y="-30%" width="220%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40">
        <div className="h-36 w-2/3 rounded-full bg-brand/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <span className="rounded-full border border-line bg-surface/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          {fromBadge}
        </span>

        <Rope />

        <motion.div
          style={{ scale: pulseScale }}
          className="inline-flex items-center gap-2.5 rounded-full border border-brand/40 bg-surface/95 px-5 py-2 shadow-xl backdrop-blur-md"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink">{title}</span>
          <Sparkles className="h-3.5 w-3.5 text-brand" />
        </motion.div>

        <Rope />

        <span className="rounded-full border border-brand/30 bg-brand-soft/70 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-ink">
          {toBadge}
        </span>
      </div>
    </div>
  );
}
