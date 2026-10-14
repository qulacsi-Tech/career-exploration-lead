"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";

export type StoryFrameItem = {
  key: string;
  /** Small line above the headline — mode of study, city, whatever fits. */
  eyebrow: string;
  /** The headline. Split into words and staggered in, so keep it short. */
  headline: string;
  /** Quieter second line: the university, the state. */
  subline: string;
  /**
   * One or more photographs of the item.
   *
   * Where there is more than one they cross-fade inside the frame, on their own
   * slower timer than the story rotation. Two is the intended case — the client
   * asked for two images per college — and one still works, in which case
   * nothing fades and no controls appear.
   */
  images: string[];
  imageAlt: string;
  /** Two to four facts. Rendered as a run-in definition row under the text. */
  facts: { label: string; value: string }[];
  href: string;
  cta: string;
};

/** How long each story holds the frame before the next one takes over. */
const DWELL = 5200;

/**
 * How long each photograph holds before cross-fading to the next.
 *
 * Longer than the story dwell on purpose: two things changing on the same beat
 * read as one glitch, and the photograph is the slower, quieter layer.
 */
const PHOTO_DWELL = 3800;

/**
 * The photographs for one story, cross-fading in place.
 *
 * ## Stops on hover and on keyboard focus
 *
 * Both, not just hover. `pointer-fine` users get the pause the client asked
 * for; a keyboard user tabbing to the card gets the same, because a picture
 * changing under a focused link is exactly as distracting either way. This is
 * the behaviour `recruiter-marquee` already has in CSS (globals.css) — the same
 * rule, expressed in state because this fade is driven by a timer rather than
 * by an animation that can simply be paused.
 *
 * `paused` from the parent covers the two cases the card cannot see for itself:
 * the frame being off screen, and the visitor having pressed Pause.
 */
function PhotoCrossfade({
  images,
  alt,
  paused,
}: {
  images: string[];
  alt: string;
  paused: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  /*
    De-duplicated before anything else.

    A caller can hand over the same file twice — several of the photo pool's
    entries double as a college's or university's own art, so an innocent
    `[ownArt, primaryPhoto]` pair collapses to one image for some slugs. Fading
    a photograph to itself looks like a frozen card rather than a transition,
    and React separately objects to the repeated key. Collapsing here means the
    single-image branch below takes over and the card is honestly static.
  */
  const frames = Array.from(new Set(images));
  const total = frames.length;
  const running = total > 1 && !paused && !held && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % total), PHOTO_DWELL);
    return () => clearTimeout(timer);
  }, [running, index, total]);

  // A story with one photograph needs none of the machinery below.
  if (total <= 1) {
    return (
      <Image
        src={frames[0]}
        alt={alt}
        fill
        // An uploaded photo is served by the API on another origin, which the optimizer is not set up for.
        unoptimized={frames[0].startsWith("http")}
        sizes="(max-width: 640px) 90vw, 42vw"
        className="object-cover"
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      {frames.map((src, i) => (
        /*
          All photographs stay mounted and only their opacity moves. Swapping
          the `src` of one <img> would show a blank box on every change until
          the next file decoded — the flash the cross-fade exists to avoid.

          Keyed by src, which is unique because `frames` is de-duplicated above.
        */
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : ""}
          aria-hidden={i !== 0}
          fill
          unoptimized={src.startsWith("http")}
          sizes="(max-width: 640px) 90vw, 42vw"
          className={`object-cover transition-opacity duration-[1200ms] ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

const wordIn = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

/**
 * A full-width editorial frame that tells one item at a time.
 *
 * The layout is the point: the image is *in the text flow*, floated inside the
 * copy block, so the headline, the subline and the facts wrap around it the way
 * type wraps a picture on a magazine spread — not a card beside a column. A
 * ghost numeral sits behind the whole thing and changes with the story.
 *
 * It runs on a timer rather than on scroll: nothing is pinned, the page scrolls
 * past normally, and the frame advances on its own while it is on screen.
 */
export function AutoStoryFrame({
  label,
  title,
  highlight,
  items,
  tone = "light",
  layout = "float",
  ground = "alt",
}: {
  /** Optional small-caps line above the heading in the frame's top rail. */
  label?: string;
  title: string;
  /** Trailing words of the title, set in italic. */
  highlight?: string;
  items: StoryFrameItem[];
  /** `brand` is the frame on a brand-coloured ground: dark glass, white type. */
  tone?: "light" | "brand";
  /**
   * `float` wraps the text around a floated picture. `split` is two halves: the words on the left, and the
   * picture on the right with the facts laid over it as glass tiles, as on a destination card.
   */
  layout?: "float" | "split";
  /** The section's background, so neighbouring sections can alternate: `alt` is tinted, `plain` is the page colour. */
  ground?: "alt" | "plain";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  // No `once`: the timer stops once the frame is scrolled out of view.
  const inView = useInView(sectionRef, { amount: 0.3 });
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  // The split layout shows two items side by side, so a "page" is a pair.
  const perPage = layout === "split" ? 2 : 1;
  const total = Math.ceil(items.length / perPage);

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + total) % total),
    [total]
  );

  useEffect(() => {
    if (!playing || !inView || reduceMotion || total < 2) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % total), DWELL);
    return () => clearTimeout(timer);
  }, [active, playing, inView, reduceMotion, total]);

  const touchX = useRef<number | null>(null);
  const pages = Array.from({ length: total }, (_, p) => items.slice(p * perPage, p * perPage + perPage));

  const renderCard = (it: StoryFrameItem, focusable: boolean) => (
    <div key={it.key}>
                        <Link
                          href={it.href}
      tabIndex={focusable ? undefined : -1}
                          aria-label={it.headline}
                          className="group relative block min-h-[400px] overflow-hidden rounded-[26px] bg-brand-ink shadow-[0_30px_70px_-35px_rgba(28,33,40,0.6)] sm:min-h-[440px]"
                        >
                          <PhotoCrossfade images={it.images} alt={it.imageAlt} paused={!playing || !inView || !focusable} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/35" />
                          <div className="absolute inset-0 flex flex-col p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className="max-w-[75%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink shadow-sm backdrop-blur">
                                {it.eyebrow}
                              </span>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:border-transparent group-hover:bg-white group-hover:text-black">
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              </span>
                            </div>

                            <div className="mt-auto flex flex-col gap-2 pt-6 text-center">
                              <h3 className="line-clamp-2 font-display text-2xl font-light leading-tight tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)] sm:text-3xl">
                                {it.headline}
                              </h3>
                              <p className="text-sm font-light text-white/80">{it.subline}</p>
                              <span aria-hidden="true" className="mx-auto h-px w-10 bg-white/50" />
                              {/* Plain lines, one per mode; a mode with nothing to say is left out. */}
                              {it.facts.some((fact) => fact.value.trim() !== "") && (
                                <dl className="mt-1 space-y-1.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
                                  {it.facts
                                    .filter((fact) => fact.value.trim() !== "")
                                    .map((fact) => (
                                      <div key={fact.label} className="flex flex-wrap items-baseline justify-center gap-x-2.5">
                                        {fact.label && <dt className="text-[10px] font-light uppercase tracking-[0.22em] text-white/60">{fact.label}</dt>}
                                        <dd className="text-sm font-light text-white sm:text-[15px]">{fact.value}</dd>
                                      </div>
                                    ))}
                                </dl>
                              )}
                              <span className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-ink transition-colors group-hover:bg-brand group-hover:text-white">
                                {it.cta}
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                            </div>
                          </div>
                        </Link>
    </div>
  );

  const onBrand = tone === "brand";
  const pageItems = items.slice(active * perPage, active * perPage + perPage);
  const item = items[active];

  const frame = onBrand ? "border-white/25 bg-white/12" : "border-white/70 bg-white/50";
  const control = onBrand
    ? "border-white/30 bg-white/15 text-white hover:bg-white hover:text-brand"
    : "border-white/70 bg-white/60 text-ink hover:border-brand/40 hover:bg-brand hover:text-white";
  const heading = onBrand ? "text-white" : "text-ink";
  const quiet = onBrand ? "text-white/70" : "text-ink-soft";
  const faint = onBrand ? "text-white/45" : "text-ink-faint";
  const rule = onBrand ? "border-white/20" : "border-line";

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden py-4 ${onBrand ? "bg-brand" : `border-b border-line ${ground === "plain" ? "bg-bg" : "bg-bg-alt"}`}`}
    >

      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-4 sm:px-6 lg:px-10">
        <div
          className={`relative overflow-hidden rounded-[36px] border shadow-[0_40px_110px_-50px_rgba(28,33,40,0.5)] backdrop-blur-2xl ${frame}`}
        >
          {/* Glass tells: a lit top edge and a sheen that crosses on a loop */}
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-120%", "520%"] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
          />

          {/* Top rail: section identity on the left, transport on the right */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 sm:px-10 ${rule}`}
          >
            <div>
              {label && (
                <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${faint}`}>
                  {label}
                </span>
              )}
              <h2
                className={`font-display text-2xl font-semibold tracking-tight sm:text-3xl ${heading}`}
              >
                {title}
                {highlight && (
                  <span className={`italic ${onBrand ? "text-white/85" : "text-brand"}`}>
                    {" "}
                    {highlight}
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: total }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show page ${i + 1} of ${total}`}
                    aria-current={i === active}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === active
                        ? onBrand
                          ? "w-8 bg-white"
                          : "w-8 bg-brand"
                        : onBrand
                          ? "w-4 bg-white/30 hover:bg-white/60"
                          : "w-4 bg-line hover:bg-brand/40"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous story"
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-xl transition-colors ${control}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next story"
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-xl transition-colors ${control}`}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-pressed={!playing}
                aria-label={playing ? "Pause" : "Play"}
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-xl transition-colors ${control}`}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* The spread */}
          <div className="relative min-h-[420px] px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
            {/* Ghost numeral, behind the type, changing with the story */}
            {layout === "float" && (
            <AnimatePresence mode="wait">
              <motion.span
                key={`n-${item.key}`}
                aria-hidden
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: onBrand ? 0.12 : 0.06, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className={`pointer-events-none absolute -right-2 top-2 select-none font-display text-[10rem] font-bold leading-none sm:text-[14rem] ${heading}`}
              >
                {String(active + 1).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
            )}

{layout === "split" ? (
              /* A sliding track: every page sits side by side and the track glides across, with swipe on touch screens. */
              <div
                className="-my-6 overflow-hidden py-6"
                onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchX.current === null) return;
                  const dx = e.changedTouches[0].clientX - touchX.current;
                  touchX.current = null;
                  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                }}
              >
                <div
                  className="flex transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ transform: `translateX(-${active * 100}%)` }}
                >
                  {pages.map((page, p) => (
                    <div
                      key={p}
                      aria-hidden={p !== active || undefined}
                      className={`grid w-full shrink-0 gap-5 md:gap-6 ${page.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-3xl"}`}
                    >
                      {page.map((it) => renderCard(it, p === active))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={pageItems.map((i) => i.key).join("|")}
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{ show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
                className="relative"
              >
                <>
                {/*
                  The image is floated *inside* the copy, not placed beside it:
                  the headline, subline and facts all wrap around it, so the
                  picture sits in the text rather than next to it. `shape-outside`
                  rounds the wrap to match the corner radius.
                */}
                <motion.figure
                  variants={{
                    hidden: { opacity: 0, scale: 0.94, clipPath: "inset(0 0 100% 0 round 28px)" },
                    show: {
                      opacity: 1,
                      scale: 1,
                      clipPath: "inset(0 0 0% 0 round 28px)",
                      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  className="relative mb-4 ml-0 aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-white/60 bg-bg-alt shadow-[0_30px_70px_-35px_rgba(28,33,40,0.6)] sm:float-right sm:mb-6 sm:ml-8 sm:w-[46%] lg:w-[42%]"
                  style={{ shapeOutside: "inset(0 round 28px)", shapeMargin: "1.5rem" }}
                >
                  <PhotoCrossfade
                    images={item.images}
                    alt={item.imageAlt}
                    paused={!playing || !inView}
                  />
                  {/* Eyebrow rides on the image, so the text column starts on the headline */}
                  <figcaption className="absolute inset-x-4 bottom-4">
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-black/40 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                      {item.eyebrow}
                    </span>
                  </figcaption>
                </motion.figure>

                {/* Headline, one word at a time */}
                <h3
                  className={`font-display text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.9rem] ${heading}`}
                >
                  {item.headline.split(" ").map((word, i) => (
                    <motion.span
                      key={`${word}-${i}`}
                      variants={wordIn}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block"
                    >
                      {word}&nbsp;
                    </motion.span>
                  ))}
                </h3>

                <motion.p
                  variants={wordIn}
                  transition={{ duration: 0.5 }}
                  className={`mt-3 text-base sm:text-lg ${quiet}`}
                >
                  {item.subline}
                </motion.p>

                {/* Facts wrap around the picture too */}
                <motion.dl
                  variants={wordIn}
                  transition={{ duration: 0.5 }}
                  className={`mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-6 text-sm ${rule}`}
                >
                  {item.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className={`text-[11px] uppercase tracking-[0.14em] ${faint}`}>
                        {fact.label}
                      </dt>
                      <dd className={`mt-1 font-semibold ${heading}`}>{fact.value}</dd>
                    </div>
                  ))}
                </motion.dl>

                <motion.div variants={wordIn} transition={{ duration: 0.5 }} className="mt-8">
                  <Link
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm backdrop-blur-xl transition-colors ${control}`}
                  >
                    {item.cta}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </motion.div>

                {/* Clears the float so the frame never collapses behind the image */}
                <div className="clear-both" />
                </>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
