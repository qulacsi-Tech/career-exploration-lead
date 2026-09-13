"use client";

import { motion } from "framer-motion";

/**
 * The client's hand-drawn leaf art, used as one ambient backdrop layer.
 *
 * ## Why a mask and not an <img>
 *
 * The source art is gold-and-white line work on a dark navy ground. Dropped
 * onto the site's light sections it would read as a navy rectangle, and tinting
 * an opaque image with CSS filters cannot recolour it per palette. So the art
 * ships as an **alpha mask** — the navy dropped out by luminance, the strokes
 * kept — and this component paints *through* it. The leaves therefore take
 * `--color-brand` and recolour with `[data-theme]` like everything else, and on
 * a brand-coloured ground the same mask is filled white instead.
 *
 * Two layers make the glow: a blurred fill that breathes under the strokes, and
 * a crisp fill on top. Both are the same mask, so the light always sits exactly
 * where the drawing is.
 *
 * ## Asset
 *
 * `leaf-lines-mask.webp` (2000x1250, ~300KB) is generated from the supplied
 * 38MB SVG — a traced drawing whose paths are far too heavy to ship or parse.
 * The rasterised colour version sits beside it as `leaf-lines.webp`, and the
 * original SVG is kept out of `public/` in `design-assets/`.
 */
const MASK = "/images/backgrounds/leaf-lines-mask.webp";

/** Orientations, so consecutive sections are not the same picture twice. */
const ORIENTATIONS = [
  "none",
  "scaleX(-1)",
  "scaleY(-1)",
  "scale(-1, -1)",
  "scaleX(-1) rotate(180deg)",
];

export function LeafGlow({
  variant = 0,
  tone = "light",
  intensity = "soft",
}: {
  /** Any integer; it wraps. Consecutive sections should pass consecutive ones. */
  variant?: number;
  /** `dark` fills the strokes white, for sections on a brand-coloured ground. */
  tone?: "light" | "dark";
  /** `bold` is for feature bands; `soft` sits quietly behind dense content. */
  intensity?: "soft" | "bold";
}) {
  const flip = ORIENTATIONS[((variant % ORIENTATIONS.length) + ORIENTATIONS.length) % ORIENTATIONS.length];
  const onDark = tone === "dark";

  /*
   * Deliberately faint. The client's note on the first pass was that the art
   * competed with the copy, so these are set at the level where the leaves read
   * as a shade in the paper rather than as a picture behind the text: a few
   * percent, with the glow weaker still. Treat ~0.10 as the ceiling — past that
   * the strokes start crossing headlines again.
   */
  const lineOpacity = intensity === "bold" ? (onDark ? 0.11 : 0.085) : onDark ? 0.08 : 0.06;
  const glowOpacity = intensity === "bold" ? (onDark ? 0.08 : 0.06) : 0.045;
  const fill = onDark ? "#ffffff" : "var(--color-brand)";

  const mask = {
    WebkitMaskImage: `url(${MASK})`,
    maskImage: `url(${MASK})`,
    WebkitMaskSize: "cover",
    maskSize: "cover",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  } as const;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ transform: flip === "none" ? undefined : flip }}
    >
      {/* Glow: the same drawing, blurred, breathing under the strokes */}
      <motion.div
        className="absolute -inset-8"
        style={{ ...mask, background: fill, filter: "blur(22px)" }}
        initial={{ opacity: glowOpacity }}
        animate={{ opacity: [glowOpacity, glowOpacity * 0.55, glowOpacity] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The strokes themselves, drifting slowly so the band never sits still */}
      <motion.div
        className="absolute inset-0"
        style={{
          ...mask,
          backgroundImage: onDark
            ? "linear-gradient(120deg, #ffffff, #ffe8c9)"
            : "linear-gradient(120deg, var(--color-brand), #2f8f7a)",
          opacity: lineOpacity,
        }}
        initial={{ scale: 1, y: 0 }}
        animate={{ scale: [1, 1.035, 1], y: [0, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
