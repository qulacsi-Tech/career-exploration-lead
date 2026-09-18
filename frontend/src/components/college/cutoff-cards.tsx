"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RevealGroup, RevealItem } from "@/components/college/reveal";
import { CountUp } from "@/components/college/reveal";

/**
 * Cutoffs as dials rather than as three lines of text.
 *
 * A percentile is a position on a scale, and a number alone does not show the
 * scale. Drawn as an arc, "72 percentile" and "80 percentile" are instantly
 * two different distances — which is the comparison a visitor is making when
 * they look at this section at all.
 *
 * ## Only when the number means something on a 0-100 scale
 *
 * `score` is authored as free text: "72 percentile", but also "185 marks",
 * which has no denominator anywhere in the data. Drawing 185 on a 100-point
 * ring would be a fabricated chart. So the parse below only produces an arc
 * for percentile and percentage values, and anything else renders as the
 * figure it is, in the same card, at the same size. The section stays honest
 * and still looks deliberate.
 *
 * The ring animates by `pathLength`, which framer normalises to 0-1 for an SVG
 * shape — no circumference arithmetic, and it stays correct if the radius
 * changes.
 */

export type CutoffItem = {
  exam: string;
  category: string;
  score: string;
};

/** A 0-100 reading, or null when the figure is not on that scale. */
function asPercent(score: string): number | null {
  if (!/percentile|percent|%/i.test(score)) return null;
  const match = score.match(/[\d.]+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

const RADIUS = 42;

function Dial({ percent }: { percent: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--color-line-soft)"
          strokeWidth="8"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="8"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: percent / 100 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={reduceMotion ? { pathLength: percent / 100 } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold text-ink">
          <CountUp value={percent} decimals={percent % 1 === 0 ? 0 : 1} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          percentile
        </span>
      </div>
    </div>
  );
}

export function CutoffCards({ cutoffs }: { cutoffs: CutoffItem[] }) {
  return (
    <RevealGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {cutoffs.map((cutoff, i) => {
        const percent = asPercent(cutoff.score);

        return (
          <RevealItem key={`${cutoff.exam}-${cutoff.category}-${i}`}>
            <article className="group relative h-full overflow-hidden rounded-3xl border border-line bg-surface p-6 text-center transition-all duration-500 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
              {/* A faint ghost of the exam name behind the dial, so the card
                  has depth without another border or panel in it. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-4 select-none font-display text-7xl font-extrabold text-line-soft/70 transition-transform duration-500 group-hover:-translate-y-1"
              >
                {cutoff.exam}
              </span>

              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                  {cutoff.exam}
                </p>
                <p className="mt-1 text-xs text-ink-faint">{cutoff.category} category</p>

                <div className="mt-5 flex justify-center">
                  {percent !== null ? (
                    <Dial percent={percent} />
                  ) : (
                    /* Same 128px box as the dial, so a mixed row of cards keeps
                       one baseline instead of stepping up and down. */
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 border-line-soft">
                      <span className="font-display text-2xl font-extrabold text-ink">
                        {cutoff.score.match(/[\d.]+/)?.[0] ?? cutoff.score}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                        {cutoff.score.replace(/[\d.\s]+/, "") || "score"}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-5 text-sm text-ink-soft">
                  Closing score for {cutoff.exam} in the {cutoff.category.toLowerCase()} category.
                </p>
              </div>
            </article>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
