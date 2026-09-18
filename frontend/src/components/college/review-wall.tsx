"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Star } from "lucide-react";
import { CountUp, Reveal, RevealGroup, RevealItem } from "@/components/college/reveal";

/**
 * Reviews, as a summary panel beside the reviews themselves.
 *
 * The section was a stack of bordered boxes with a rating pill in each corner.
 * The problem was not how they looked — it was that the aggregate and the
 * individual voices were in two different places on the page, so a visitor
 * read "4.3 overall" in the Overview and, four sections later, one person's
 * paragraph, and never put the two together.
 *
 * Here the panel and the quotes are one section. The panel answers "what do
 * students think" with the category breakdown drawn as bars; the cards answer
 * "who said so".
 *
 * ## The bars are the whole argument
 *
 * A college's four category scores land within a few tenths of each other —
 * 4.1, 4.3, 4.4, 4.2. As digits that is noise. As bars against a common 5.0
 * baseline, the shape of the college is legible at a glance: strong on
 * infrastructure, weaker on placements. Each bar grows from zero on entry, so
 * the comparison assembles itself as you arrive.
 *
 * ## Sized for the data that actually exists
 *
 * Colleges here carry one or two written reviews against review *counts* in
 * the hundreds. So the cards are built to look deliberate at n=1 — full width
 * of their column, generous type — rather than as a grid that reads as broken
 * until a dozen arrive. The count in the panel carries the volume; the cards
 * carry the voice.
 */

export type ReviewItem = {
  author: string;
  course: string;
  batch: string;
  verified: boolean;
  date: string;
  rating: number;
  body: string;
};

/** Five stars with the score's fraction filled — a read-out, not an input. */
function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        return (
          <span key={i} className="relative">
            <Star className="h-4 w-4 text-line" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-4 w-4 fill-gold text-gold" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function ReviewWall({
  overall,
  reviewCount,
  breakdown,
  reviews,
}: {
  overall: number;
  reviewCount: number;
  breakdown: { label: string; score: number }[];
  reviews: ReviewItem[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Summary panel */}
      <Reveal>
        <div className="relative h-full overflow-hidden rounded-3xl border border-brand/25 bg-brand-soft p-7 lg:sticky lg:top-[150px]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand/10"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full border border-brand/15"
          />

          <div className="relative">
            <p className="font-display text-6xl font-extrabold leading-none text-brand-ink">
              <CountUp value={overall} decimals={1} />
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Stars score={overall} />
              <span className="text-sm font-semibold text-brand-ink/80">out of 5</span>
            </div>
            <p className="mt-2 text-sm text-brand-ink/70">
              Based on {reviewCount.toLocaleString("en-IN")} student reviews
            </p>

            <ul className="mt-7 space-y-4">
              {breakdown.map((row, i) => (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-brand-ink">{row.label}</span>
                    <span className="font-display font-bold text-brand-ink">
                      {row.score.toFixed(1)}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/70"
                  >
                    <motion.span
                      className="block h-full rounded-full bg-brand"
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{
                        duration: 0.9,
                        delay: 0.1 + i * 0.09,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      /* Width sets the value, scaleX animates it — animating
                         width would lay the section out on every frame. */
                      style={{ width: `${(row.score / 5) * 100}%`, transformOrigin: "left" }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* The written reviews */}
      <RevealGroup className="space-y-5">
        {reviews.map((review, i) => (
          <RevealItem key={`${review.author}-${i}`} as="article">
            <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-7 transition-all duration-500 hover:border-brand/40 hover:shadow-lg">
              {/* Oversized quote mark, clipped by the card. Set as text so it
                  picks up the display face rather than being another asset. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-8 select-none font-display text-[10rem] leading-none text-line-soft/60 transition-transform duration-700 group-hover:-translate-y-2"
              >
                &rdquo;
              </span>

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Initial-mark rather than an avatar: there is no photo in
                      the data, and a generic silhouette says less than a
                      letter does. */}
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-base font-bold text-white">
                    {review.author.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      {review.author}
                      {review.verified && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
                          title="Verified student"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Verified
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {review.course} &middot; Batch {review.batch}
                    </p>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5">
                    <Stars score={review.rating} />
                    <span className="font-display text-sm font-bold text-ink">
                      {review.rating.toFixed(1)}
                    </span>
                  </span>
                </div>

                <blockquote className="mt-5 text-base leading-relaxed text-ink-soft">
                  {review.body}
                </blockquote>

                <p className="mt-4 text-xs text-ink-faint">Reviewed on {review.date}</p>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
