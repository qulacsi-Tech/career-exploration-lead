/**
 * The recruiter names as a continuous marquee.
 *
 * They were a static wrap of chips. A dozen company names in a fixed block is
 * a list to skim past; the same names moving read as a roster that continues
 * past the edge of the screen, which is the impression the placement section
 * is actually making. Same content, and every name is still in the DOM.
 *
 * ## Why this one is CSS and not framer-motion
 *
 * Everything else on this page animates through framer. This does not, for two
 * reasons. It never stops, so a JS-driven animation would hold a rAF loop for
 * the life of the page; and pausing on hover — which the strip needs, or a
 * name can never actually be read — is one `animation-play-state` declaration
 * in CSS against a state round-trip in JS. Reduced motion is handled in the
 * same stylesheet, so this stays a server component with no client bundle.
 *
 * ## How the loop is seamless
 *
 * The row is rendered twice and the track translates by exactly -50%. At the
 * moment the first copy has fully left, the second sits precisely where the
 * first began, so the reset is invisible. The duplicate is `aria-hidden`: a
 * screen reader should hear each recruiter once.
 *
 * Keyframes, the hover pause and the reduced-motion fallback live under
 * `.recruiter-marquee` in globals.css.
 */
export function RecruiterMarquee({ recruiters }: { recruiters: string[] }) {
  /* Pace by content: a longer roster would otherwise sprint to cover twice the
     distance in the same time. ~4.5s per name reads at a glance. */
  const duration = `${Math.max(recruiters.length * 4.5, 18)}s`;

  const row = (hidden: boolean) => (
    <ul
      className="recruiter-marquee-row flex shrink-0 items-center gap-3 pr-3"
      aria-hidden={hidden || undefined}
    >
      {recruiters.map((name) => (
        <li
          key={name}
          className="whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-brand/40 hover:text-brand"
        >
          {name}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="recruiter-marquee relative overflow-hidden">
      {/* Fades at both edges, so names enter and leave rather than being cut. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg-alt to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg-alt to-transparent"
      />

      <div
        className="recruiter-marquee-track flex w-max"
        style={{ animationDuration: duration }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
