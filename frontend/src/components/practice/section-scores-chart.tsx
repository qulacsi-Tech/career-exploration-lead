"use client";

import type { AttemptResult } from "@/lib/practice-attempt";

/**
 * Score against the maximum, one bar per section.
 *
 * Drawn as plain SVG in the same idiom as the admin's leads chart — same
 * gridline treatment, same token colours, native `<title>` for the hover
 * readout, no charting library. Two screens that draw bars two different ways
 * is how a product starts looking assembled rather than designed.
 *
 * Each section shows a filled bar inside a track: the track is what was
 * available, the fill is what was scored. Plotting the score alone would make
 * 12/15 and 12/30 look identical, which is the one comparison this chart
 * exists to support.
 *
 * A negative section score — more wrong than right, under a marking penalty —
 * draws below the baseline rather than clamping to zero, because a candidate
 * who has gone backwards needs to see that they have.
 */
export function SectionScoresChart({ result }: { result: AttemptResult }) {
  const sections = result.sections;
  if (sections.length === 0) return null;

  const width = 720;
  const rowHeight = 46;
  const padding = { top: 8, right: 56, bottom: 8, left: 92 };
  const height = padding.top + padding.bottom + sections.length * rowHeight;
  const plotWidth = width - padding.left - padding.right;

  const axisMax = Math.max(...sections.map((s) => s.maxScore), 1);
  const lowest = Math.min(0, ...sections.map((s) => s.score));
  // Space for the negative side only when something actually went negative.
  const axisMin = lowest < 0 ? lowest : 0;
  const span = axisMax - axisMin;
  const zeroX = padding.left + ((0 - axisMin) / span) * plotWidth;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={sections
          .map((s) => `${s.label}: ${s.score} out of ${s.maxScore}`)
          .join(". ")}
      >
        {sections.map((section, i) => {
          const y = padding.top + i * rowHeight;
          const barY = y + 12;
          const barHeight = 20;

          const trackX = padding.left + ((0 - axisMin) / span) * plotWidth;
          const trackWidth = (section.maxScore / span) * plotWidth;

          const fillStart = Math.min(0, section.score);
          const fillEnd = Math.max(0, section.score);
          const fillX = padding.left + ((fillStart - axisMin) / span) * plotWidth;
          const fillWidth = ((fillEnd - fillStart) / span) * plotWidth;

          const negative = section.score < 0;

          return (
            <g key={section.id}>
              <title>
                {`${section.label}: ${section.score} of ${section.maxScore} · ${section.correct} correct, ${section.incorrect} incorrect, ${section.skipped} skipped`}
              </title>

              <text
                x={padding.left - 10}
                y={barY + 14}
                textAnchor="end"
                className="fill-[var(--color-ink)] text-[12px] font-semibold"
              >
                {section.label}
              </text>

              {/* The track: everything that was on offer. */}
              <rect
                x={trackX}
                y={barY}
                width={Math.max(0, trackWidth)}
                height={barHeight}
                rx="4"
                fill="var(--color-line-soft)"
              />

              {/* The fill: what was scored. */}
              <rect
                x={fillX}
                y={barY}
                width={Math.max(0, fillWidth)}
                height={barHeight}
                rx="4"
                fill={negative ? "var(--practice-unanswered)" : "var(--color-brand)"}
              />

              <text
                x={width - padding.right + 8}
                y={barY + 14}
                className="fill-[var(--color-ink-soft)] text-[11px] tabular-nums"
              >
                {section.score}/{section.maxScore}
              </text>
            </g>
          );
        })}

        {/* The baseline, drawn last so it sits over the tracks. */}
        <line
          x1={zeroX}
          x2={zeroX}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />
      </svg>
    </figure>
  );
}
