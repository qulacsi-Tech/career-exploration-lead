/**
 * The TopCollegePath mark, drawn inline so it recolours with the palette.
 *
 * Inline rather than an <Image> pointing at a .svg for the same reason
 * hero-backdrop.tsx is: every fill reads a --logo-* custom property, so the
 * badge follows <html data-theme> instantly. A referenced file cannot — its
 * colours are baked in, and swapping one per variant would mean seven files to
 * keep in step plus a fetch mid-switch.
 *
 * ## One lockup, tagline always
 *
 * An earlier revision split this into two lockups and dropped the tagline from
 * the header, on the theory that the freed height was the only way to grow the
 * wordmark. The client rejected that trade — the tagline is part of the mark and
 * stays everywhere — so the height had to come from somewhere else.
 *
 * It came from the plate and the artwork. The old plate was 170 units tall for
 * two lines of type, most of it spent on a staircase drawn nearly the full
 * height of the canvas. Shortening the plate to 140 and taking the mark down to
 * 62% removes that dead space, and the type absorbs all of it:
 *
 *                  plate      at 72px tall   mark height   wordmark   tagline
 *   original       530x170      224px wide     55.9px        14.0px     6.4px
 *   this           512x140      263px wide     42.1px        19.5px     8.2px
 *
 * So the wordmark renders **39% larger** and the tagline **29% larger**, with
 * the tagline intact — and the mark comes down 25%, which is the "logo/icon
 * size should be properly proportionate with the text" note in the same
 * feedback. Mark height against cap height went from 5.6:1 to 3.0:1.
 *
 * The cost is 39px of width at header size. That is the honest trade: keeping
 * the tagline while enlarging the type has to be paid for somewhere, and width
 * is the only budget left once the plate and the mark are both as tight as they
 * usefully go.
 *
 * ## Fitting the type — measure it, do not compute it
 *
 * Arial is deliberate: it is the face the client's artwork is set in. But every
 * width here comes from `getBBox()` in a browser, not from Arial's metrics, and
 * that distinction matters. The SVG asks for weight 800, which Arial has no cut
 * for, so the browser synthesises the weight and sets the name **~13% wider**
 * than Arial Bold measures — 334.4 units against the ~301 the metric predicts
 * at size 38. An SVG clips to its viewBox, so trusting the metric puts the
 * "Path" through the right edge, which is how this was drawn wrong once already.
 *
 * Measured, at the sizes used below:
 *
 *   wordmark 38   334.4 wide   x 158 -> 492.4   plate 512, 19.6 clear
 *   tagline  16   268.3 wide   centred on 325    x 191 -> 459
 *
 * The 19.6 units left past the wordmark match the mark's 20-unit left margin,
 * so the plate reads evenly weighted. If the type is ever resized, re-measure —
 * do not scale these numbers.
 *
 * ## Vertical rhythm
 *
 * The two lines are centred as a block down the 140-unit plate, with the gap
 * between them opened to ~20 units so the tagline reads as its own line rather
 * than as something crowding the wordmark:
 *
 *   40.8  above the wordmark's cap height
 *   19.5  between the wordmark baseline and the tagline's cap top
 *   41.0  below the tagline baseline
 *
 * Top and bottom are within a unit of each other, which is what stops the block
 * looking like it has slipped upward in the plate.
 *
 * Decorative: the <Link> that wraps it carries the accessible name.
 */

/** Plate geometry, named so the note above has something to point at. */
const PLATE_W = 512;
const PLATE_H = 140;

/**
 * Places the mark's native coordinates (x 18–210, y 16–148) onto the plate:
 * scaled to 62%, left edge at x 20, centred vertically.
 */
const MARK_TRANSFORM = "translate(8.84 19.18) scale(0.62)";

const TEXT_X = 158;
const WORD_Y = 68;
const WORD_SIZE = 38;

/**
 * The tagline is centred on the wordmark, not left-aligned with it.
 *
 * Left-aligned, the two lines share a left edge but the tagline (268 units) is
 * 66 short of the wordmark (334), so the block hangs to the left and reads as a
 * mistake. Centring is done with `textAnchor="middle"` about the wordmark's
 * centre rather than by hard-coding a start x: the tagline is editable copy, and
 * an x computed from today's string would need recomputing the moment it
 * changed.
 *
 * Wordmark centre = TEXT_X + 334.4 / 2.
 */
const TAGLINE_CENTER_X = 325;
const TAGLINE_Y = 99;
const TAGLINE_SIZE = 16;

export function SiteLogo({
  className,
  /**
   * Scopes the gradient and filter ids.
   *
   * The header and the footer both render this, and two elements sharing an id
   * is invalid markup — the second instance's `url(#…)` references resolve
   * against the first. Harmless while both are drawn identically, but it stops
   * being harmless the moment one is tinted differently, so the call sites keep
   * them distinct.
   */
  idPrefix = "ctlogo",
}: {
  className?: string;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id("plate")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--logo-plate-top)" />
          <stop offset="100%" stopColor="var(--logo-plate-bot)" />
        </linearGradient>

        <linearGradient id={id("bar")} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--logo-bar-lo)" />
          <stop offset="55%" stopColor="var(--logo-bar-mid)" />
          <stop offset="100%" stopColor="var(--logo-bar-hi)" />
        </linearGradient>

        <linearGradient id={id("gold")} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--logo-bar-hi)" />
          <stop offset="100%" stopColor="var(--logo-accent)" />
        </linearGradient>

        {/* userSpaceOnUse in the mark's own coordinates — the <g> transform
            carries it onto the plate, so these numbers stay independent of
            where the mark is placed. */}
        <linearGradient
          id={id("pole-grad")}
          x1="154"
          y1="52"
          x2="154"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--logo-bar-mid)" />
          <stop offset="100%" stopColor="var(--logo-accent)" />
        </linearGradient>

        <filter id={id("glow")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={PLATE_W} height={PLATE_H} rx="18" fill={`url(#${id("plate")})`} />
      <rect
        className="ctlogo-frame"
        x="1"
        y="1"
        width={PLATE_W - 2}
        height={PLATE_H - 2}
        rx="17"
        fill="none"
        stroke="var(--logo-frame)"
        strokeWidth="2"
      />

      {/* The mark, in its native coordinates and placed by MARK_TRANSFORM. */}
      <g transform={MARK_TRANSFORM}>
        {/* steps: 5 bars of 24 on a 31 pitch, x 18 -> 166, baseline y 148.
            The tallest is 96, not the 106 the ascent would suggest: it leaves
            headroom for a flag big enough to read at header size. */}
        <g filter={`url(#${id("glow")})`}>
          <rect className="ctlogo-step ctlogo-step1" x="18" y="128" width="24" height="20" rx="3" fill={`url(#${id("bar")})`} />
          <rect className="ctlogo-step ctlogo-step2" x="49" y="112" width="24" height="36" rx="3" fill={`url(#${id("bar")})`} />
          <rect className="ctlogo-step ctlogo-step3" x="80" y="92" width="24" height="56" rx="3" fill={`url(#${id("bar")})`} />
          <rect className="ctlogo-step ctlogo-step4" x="111" y="68" width="24" height="80" rx="3" fill={`url(#${id("bar")})`} />
          <rect className="ctlogo-step ctlogo-step5" x="142" y="52" width="24" height="96" rx="3" fill={`url(#${id("bar")})`} />
        </g>

        {/* flagpole, centred on the tallest bar */}
        <line
          className="ctlogo-pole"
          x1="154"
          y1="52"
          x2="154"
          y2="16"
          stroke={`url(#${id("pole-grad")})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* flag, closing the chart column at x 210 */}
        <path
          className="ctlogo-flag"
          d="M 158 18 L 210 34 L 158 50 Z"
          fill={`url(#${id("gold")})`}
          stroke="var(--logo-plate-bot)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* text column: left-aligned at x 158, the two lines centred down the plate */}
      <text
        x={TEXT_X}
        y={WORD_Y}
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize={WORD_SIZE}
      >
        <tspan className="ctlogo-word ctlogo-word1" fill="var(--logo-word)">Top</tspan>
        <tspan className="ctlogo-word ctlogo-word2" dx="4" fill="var(--logo-word)">College</tspan>
        <tspan className="ctlogo-word ctlogo-word3" dx="4" fill="var(--logo-accent)">Path</tspan>
      </text>

      <text
        className="ctlogo-tagline"
        x={TAGLINE_CENTER_X}
        y={TAGLINE_Y}
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize={TAGLINE_SIZE}
        letterSpacing="0.3"
        fill="var(--logo-tagline)"
      >
        {"DISCOVER  "}
        <tspan className="ctlogo-dot ctlogo-dot1" fill="var(--logo-accent)">
          •
        </tspan>
        {"  CHOOSE  "}
        <tspan className="ctlogo-dot ctlogo-dot2" fill="var(--logo-accent)">
          •
        </tspan>
        {"  SUCCEED"}
      </text>
    </svg>
  );
}
