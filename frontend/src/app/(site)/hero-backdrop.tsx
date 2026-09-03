/**
 * Hero scene behind the homepage headline.
 *
 * Inline rather than an imported .svg on purpose: every fill reads a --hero-*
 * custom property, so the artwork recolours the instant the palette switches
 * on <html data-theme>. A file referenced as a CSS background could not — its
 * colours are baked in, and a swap would need a second network fetch mid-demo.
 *
 * Purely decorative, so it carries aria-hidden and no alt text. The scene is
 * deliberately dark at every variant (see --hero-sky-* in globals.css); the
 * overlay in page.tsx is what actually guarantees the headline's contrast, and
 * it was tuned against the brightest point here — the glow behind the search
 * field. Re-measure that pairing if these lightnesses move.
 *
 * To swap in client photography, replace this component and re-check that
 * overlay.
 */
export function HeroBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 600"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hero-sky-top)" />
          <stop offset="0.45" stopColor="var(--hero-sky-mid)" />
          <stop offset="1" stopColor="var(--hero-sky-bot)" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--hero-glow)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--hero-glow)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-haze" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--hero-haze)" stopOpacity="0.20" />
          <stop offset="1" stopColor="var(--hero-haze)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="600" fill="url(#hero-sky)" />
      <ellipse cx="800" cy="560" rx="760" ry="330" fill="url(#hero-glow)" />
      <ellipse cx="300" cy="140" rx="420" ry="240" fill="url(#hero-haze)" />

      {/* Stars */}
      <g fill="var(--hero-star)">
        <circle cx="130" cy="70" r="2.2" opacity="0.55" />
        <circle cx="410" cy="46" r="1.6" opacity="0.40" />
        <circle cx="640" cy="96" r="2.0" opacity="0.35" />
        <circle cx="905" cy="58" r="1.7" opacity="0.45" />
        <circle cx="1180" cy="88" r="2.3" opacity="0.50" />
        <circle cx="1420" cy="52" r="1.8" opacity="0.38" />
        <circle cx="1520" cy="150" r="2.0" opacity="0.42" />
        <circle cx="240" cy="190" r="1.5" opacity="0.30" />
        <circle cx="1310" cy="210" r="1.6" opacity="0.32" />
        <circle cx="760" cy="30" r="1.5" opacity="0.30" />
      </g>

      {/* Far skyline */}
      <g fill="var(--hero-far)" opacity="0.30">
        <rect x="60" y="392" width="120" height="208" />
        <rect x="205" y="428" width="90" height="172" />
        <rect x="700" y="404" width="110" height="196" />
        <rect x="1150" y="418" width="130" height="182" />
        <rect x="1420" y="386" width="120" height="214" />
        <path d="M330 600V398l90-58 90 58v202Z" />
        <path d="M940 600V420l80-52 80 52v180Z" />
      </g>

      {/* Mid skyline, with the domed landmark on centre-left */}
      <g fill="var(--hero-mid)" opacity="0.82">
        <rect x="0" y="452" width="150" height="148" />
        <rect x="255" y="470" width="120" height="130" />
        <rect x="1035" y="462" width="140" height="138" />
        <rect x="1330" y="478" width="160" height="122" />
        <path d="M470 600V440h240v160Z" />
        <path d="M590 356a70 70 0 0 1 70 84H520a70 70 0 0 1 70-84Z" />
        <rect x="586" y="322" width="8" height="38" rx="4" />
        <path d="M1200 600V446l86-56 86 56v154Z" />
      </g>

      {/* Near skyline: darkest, anchors the foot of the hero */}
      <g fill="var(--hero-near)" opacity="0.94">
        <rect x="-20" y="516" width="230" height="90" />
        <rect x="300" y="530" width="180" height="76" />
        <rect x="760" y="508" width="210" height="98" />
        <rect x="1120" y="536" width="190" height="70" />
        <rect x="1440" y="512" width="200" height="94" />
        <path d="M540 606V498l84-46 84 46v108Z" />
        <path d="M1010 606V520h90v86Z" />
      </g>

      {/* Lit windows */}
      <g fill="var(--hero-window)" opacity="0.30">
        <rect x="30" y="540" width="12" height="18" />
        <rect x="60" y="540" width="12" height="18" />
        <rect x="90" y="540" width="12" height="18" />
        <rect x="330" y="552" width="11" height="16" />
        <rect x="358" y="552" width="11" height="16" />
        <rect x="800" y="532" width="12" height="18" />
        <rect x="830" y="532" width="12" height="18" />
        <rect x="860" y="532" width="12" height="18" />
        <rect x="1150" y="558" width="11" height="16" />
        <rect x="1180" y="558" width="11" height="16" />
        <rect x="1470" y="536" width="12" height="18" />
        <rect x="1500" y="536" width="12" height="18" />
      </g>

      {/* Graduation caps */}
      <g fill="var(--hero-cap)" opacity="0.16">
        <path d="M250 168l64 29-64 29-64-29 64-29Zm-38 46v29c0 10 17 18 38 18s38-8 38-18v-29l-38 17-38-17Z" />
        <path d="M1330 128l50 22-50 23-50-23 50-22Zm-30 36v22c0 8 13 14 30 14s30-6 30-14v-22l-30 13-30-13Z" />
        <path d="M812 92l38 17-38 18-38-18 38-17Zm-23 28v17c0 6 10 11 23 11s23-5 23-11v-17l-23 10-23-10Z" />
      </g>
    </svg>
  );
}
