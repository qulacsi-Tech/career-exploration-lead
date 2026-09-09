"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface CircuitRopeProps {
  activeIndex?: number;
  total?: number;
}

export function CircuitRope({ activeIndex = 0, total = 6 }: CircuitRopeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0.1, 1]);

  return (
    <div ref={containerRef} className="pointer-events-none absolute left-4 top-0 bottom-0 z-20 hidden w-16 lg:left-8 lg:block">
      <svg
        className="h-full w-full"
        viewBox="0 0 64 1200"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="circuit-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.9" />
          </linearGradient>

          <filter id="neon-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track cable */}
        <path
          d="M 32 0 L 32 1200"
          stroke="currentColor"
          className="text-line"
          strokeWidth="3"
          strokeDasharray="6 6"
        />

        {/* Foreground energized circuit line */}
        <motion.path
          d="M 32 0 L 32 1200"
          stroke="url(#circuit-glow)"
          strokeWidth="3.5"
          filter="url(#neon-blur)"
          style={{ pathLength }}
          strokeLinecap="round"
        />

        {/* Animated electrical pulses traveling along the rope */}
        <motion.circle
          cx="32"
          cy="0"
          r="4"
          fill="var(--color-brand)"
          filter="url(#neon-blur)"
          animate={{
            cy: [0, 1200],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.circle
          cx="32"
          cy="0"
          r="2.5"
          fill="#ffffff"
          animate={{
            cy: [0, 1200],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.75,
          }}
        />
      </svg>
    </div>
  );
}

/**
 * Connecting conduit bridge connecting the bottom of Locations directly to Explore Your Future
 */
export function SectionCircuitBridge() {
  return (
    <div className="relative w-full overflow-hidden bg-bg-alt/50 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4">
        {/* Glowing Circuit Rope SVG connecting into the next section */}
        <div className="relative h-28 w-full max-w-md">
          <svg
            viewBox="0 0 400 120"
            className="h-full w-full overflow-visible"
            fill="none"
          >
            <defs>
              <linearGradient id="bridge-glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.4" />
                <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.8" />
              </linearGradient>

              <filter id="bridge-neon" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Circuit pathway lines */}
            <path
              d="M 200 0 L 200 30 L 140 60 L 140 90 L 200 120"
              stroke="var(--color-line)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <path
              d="M 200 0 L 200 30 L 260 60 L 260 90 L 200 120"
              stroke="var(--color-line)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />

            {/* Central glowing energised conduit */}
            <motion.path
              d="M 200 0 L 200 120"
              stroke="url(#bridge-glow)"
              strokeWidth="4"
              filter="url(#bridge-neon)"
              strokeLinecap="round"
            />

            {/* Traveling current node */}
            <motion.circle
              cx="200"
              cy="0"
              r="4.5"
              fill="#ffffff"
              stroke="var(--color-brand)"
              strokeWidth="2"
              filter="url(#bridge-neon)"
              animate={{
                cy: [0, 120],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Circuit nodes / junction points */}
            <circle cx="200" cy="0" r="5" fill="var(--color-brand)" />
            <circle cx="140" cy="60" r="3.5" fill="var(--color-brand)" opacity="0.7" />
            <circle cx="260" cy="60" r="3.5" fill="var(--color-brand)" opacity="0.7" />
            <circle cx="200" cy="120" r="6" fill="var(--color-brand)" filter="url(#bridge-neon)" />
            <circle cx="200" cy="120" r="2.5" fill="#ffffff" />
          </svg>

          {/* Glowing connector badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: [0.95, 1.02, 0.95] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface/95 px-4 py-1.5 shadow-lg backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink">
                Circuit Conduit &bull; Location Connected to Stream
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
