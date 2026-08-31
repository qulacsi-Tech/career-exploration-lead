/**
 * The TopCollegePath mark, drawn inline so it recolours with the palette.
 *
 * Inline rather than an <Image> pointing at a .svg for the same reason
 * hero-backdrop.tsx is: every fill reads a --logo-* custom property, so the
 * badge follows <html data-theme> instantly. A referenced file cannot — its
 * colours are baked in, and swapping one per variant would mean seven files to
 * keep in step plus a fetch mid-switch.
 *
 * Geometry is the header-tuned cut of the client's badge (432x256 against the
 * original 480x300): the plate is trimmed of the dead space the original spent
 * below its tagline, and the staircase is a tight cluster so the height goes to
 * the type. What the wordmark is legible at is purely its share of the canvas
 * times the rendered height, so any change to these numbers changes legibility.
 *
 * Arial is deliberate — it is the face the client's artwork is set in, and the
 * widths here were fitted to its metrics. Swapping to the site font would
 * reflow the wordmark and could push it past the plate edge.
 *
 * Decorative here: the <Link> that wraps it carries the accessible name.
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 432 256" aria-hidden="true" className={className}>
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
          x1="315"
          y1="43"
          x2="315"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--logo-bar-mid)" />
          <stop offset="100%" stopColor="var(--logo-accent)" />
        </linearGradient>

        <filter id="ctlogo-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width="432" height="256" rx="24" fill="url(#ctlogo-plate)" />
      <rect
        className="ctlogo-frame"
        x="1"
        y="1"
        width="430"
        height="254"
        rx="23"
        fill="none"
        stroke="var(--logo-frame)"
        strokeWidth="2"
      />

      {/* steps: 5 bars of 34 on a 56 pitch, x 74 -> 332, baseline y 154 */}
      <g filter="url(#ctlogo-glow)">
        <rect className="ctlogo-step ctlogo-step1" x="74" y="133" width="34" height="21" rx="4" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step2" x="130" y="116" width="34" height="38" rx="4" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step3" x="186" y="95" width="34" height="59" rx="4" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step4" x="242" y="70" width="34" height="84" rx="4" fill="url(#ctlogo-bar)" />
        <rect className="ctlogo-step ctlogo-step5" x="298" y="43" width="34" height="111" rx="4" fill="url(#ctlogo-bar)" />
      </g>

      {/* flagpole, centred on the tallest bar */}
      <line
        className="ctlogo-pole"
        x1="315"
        y1="43"
        x2="315"
        y2="16"
        stroke="url(#ctlogo-pole-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* flag, running out to the chart's right edge at 359 */}
      <path
        className="ctlogo-flag"
        d="M 317 17 L 359 29 L 317 41 Z"
        fill="url(#ctlogo-gold)"
        stroke="var(--logo-plate-bot)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <text
        x="216"
        y="206"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="46"
      >
        <tspan className="ctlogo-word ctlogo-word1" fill="var(--logo-word)">Top</tspan>
        <tspan className="ctlogo-word ctlogo-word2" fill="var(--logo-word)">College</tspan>
        <tspan className="ctlogo-word ctlogo-word3" fill="var(--logo-accent)">Path</tspan>
      </text>

      <text
        className="ctlogo-tagline"
        x="216"
        y="240"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="18"
        letterSpacing="1.1"
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
