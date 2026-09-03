/**
 * The TopCollegePath mark, drawn inline so it recolours with the palette.
 *
 * Inline rather than an <Image> pointing at a .svg for the same reason
 * hero-backdrop.tsx is: every fill reads a --logo-* custom property, so the
 * badge follows <html data-theme> instantly. A referenced file cannot — its
 * colours are baked in, and swapping one per variant would mean seven files to
 * keep in step plus a fetch mid-switch.
 *
 * Horizontal lockup (530x170): staircase on the left, wordmark and tagline
 * stacked on the right. The client's original stacks all three down a 1.6:1
 * plate, which caps how large the type can be — what the type renders at is its
 * share of the canvas times the header height, and a tall plate spends most of
 * that height on the artwork. Laying it out sideways shortens the plate, so the
 * same header row buys larger text off a much smaller footprint:
 *
 *              plate       at 64px tall     wordmark   tagline
 *   stacked    432x256     108px wide        11.5px     4.5px
 *   here       530x170     200px wide        14.7px     5.6px
 *
 * Width is deliberately tight — the lockup sits beside the search field, and a
 * wide plate crowds it. Narrowing the plate narrows the text column with it, so
 * the type came down to suit: the two move together, and a larger wordmark
 * means widening the plate rather than enlarging the type in place.
 *
 * Arial is deliberate — it is the face the client's artwork is set in, and the
 * widths here were fitted to its metrics. The wordmark is held to ~91% of the
 * 284-unit column (259 units) rather than filling it: the SVG asks for weight
 * 800, which Arial has no cut for, so a browser is free to synthesise it and
 * set the name wider than Arial Bold measures. At 98% fill it overflowed the
 * viewBox, and an SVG clips to its viewBox — the "Path" simply vanished. Keep
 * the margin if the type is ever resized.
 *
 * Decorative here: the <Link> that wraps it carries the accessible name.
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 530 170" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="ctlogo-plate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-plate-top)" />
          <stop offset="100%" stopColor="var(--logo-plate-bot)" />
        </linearGradient>

        <linearGradient id="ctlogo-bar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--logo-bar-lo)" />
          <stop offset="55%" stopColor="var(--logo-bar-mid)" />
          <stop offset="100%" stopColor="var(--logo-bar-hi)" />
        </linearGradient>

        <linearGradient id="ctlogo-gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--logo-bar-hi)" />
          <stop offset="100%" stopColor="var(--logo-accent)" />
        </linearGradient>

        <linearGradient
          id="ctlogo-pole-grad"
          x1="154"
          y1="52"
          x2="154"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--logo-bar-mid)" />
          <stop offset="100%" stopColor="var(--logo-accent)" />
        </linearGradient>

        <filter id="ctlogo-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width="530" height="170" rx="20" fill="url(#ctlogo-plate)" />
      <rect
        className="ctlogo-frame"
        x="1"
        y="1"
        width="528"
        height="168"
        rx="19"
        fill="none"
        stroke="var(--logo-frame)"
        strokeWidth="2"
      />

      {/* steps: 5 bars of 24 on a 31 pitch, x 18 -> 166, baseline y 148.
          The tallest is 96, not the 106 the ascent would suggest: it leaves
          headroom for a flag big enough to read at header size. */}
      <g filter="url(#ctlogo-glow)">
        <rect className="ctlogo-step ctlogo-step1" x="18" y="128" width="24" height="20" rx="3" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step2" x="49" y="112" width="24" height="36" rx="3" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step3" x="80" y="92" width="24" height="56" rx="3" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step4" x="111" y="68" width="24" height="80" rx="3" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step5" x="142" y="52" width="24" height="96" rx="3" fill="url(#ctlogo-bar)" />
      </g>

      {/* flagpole, centred on the tallest bar */}
      <line
        className="ctlogo-pole"
        x1="154"
        y1="52"
        x2="154"
        y2="16"
        stroke="url(#ctlogo-pole-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* flag, closing the chart column at x 210 */}
      <path
        className="ctlogo-flag"
        d="M 158 18 L 210 34 L 158 50 Z"
        fill="url(#ctlogo-gold)"
        stroke="var(--logo-plate-bot)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* text column: left-aligned at x 226, the block centred down the plate */}
      <text
        x="226"
        y="82"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="33"
      >
        <tspan className="ctlogo-word ctlogo-word1" fill="var(--logo-word)">Top</tspan>
        <tspan className="ctlogo-word ctlogo-word2" dx="4" fill="var(--logo-word)">College</tspan>
        <tspan className="ctlogo-word ctlogo-word3" dx="4" fill="var(--logo-accent)">Path</tspan>
      </text>

      <text
        className="ctlogo-tagline"
        x="226"
        y="113"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="15"
        letterSpacing="0.3"
        fill="var(--logo-tagline)"
      >
        {"DISCOVER  "}
        <tspan className="ctlogo-dot ctlogo-dot1" fill="var(--logo-accent)">
          •
        </tspan>
        {"  CHOOSE  "}
        <tspan className="ctlogo-dot ctlogo-dot2" fill="var(--logo-accent)">
          •
        </tspan>
        {"  SUCCEED"}
      </text>
    </svg>
  );
}
