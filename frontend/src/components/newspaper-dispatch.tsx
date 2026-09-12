"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Pause, Play } from "lucide-react";

type Article = { slug: string; title: string; excerpt: string; date: string };

/** How long a spread stays open before the page turns itself. */
const DWELL = 7000;
/** How long the sheet takes to travel from the right board to the left. */
const TURN = 1150;

/**
 * Latest news, set as an open book that turns its own pages.
 *
 * ## The turn
 *
 * A page turn is one sheet with two printed sides hinging on the spine, so that
 * is what this is: while the book is at rest the two boards simply show the
 * current spread. When it turns, a sheet is laid over the right board with
 * `transform-origin: left center` and rotated to -180°. Its **front** carries
 * the right page you were reading; its **back**, pre-flipped 180°, carries the
 * left page of the next spread — which is exactly what a real sheet shows as it
 * comes over. Underneath, the right board is already set with the next spread's
 * right page, so the reveal behind the moving sheet is correct at every angle.
 *
 * When the sheet finishes lying down on the left, the edition commits: the left
 * board becomes what the sheet's back was showing, and the sheet unmounts with
 * nothing visibly changing.
 *
 * `backface-visibility` is on the two faces themselves, which are direct
 * children of the `preserve-3d` sheet. Anything wrapped in between flattens its
 * own 3D context and both faces show through each other.
 *
 * Below `sm` there is no book: two boards do not fit a phone, so the spread
 * stacks and the turn is replaced by a plain change of content.
 *
 * ## The ink
 *
 * Newsprint rather than the site's card surface — warm paper ground, hairline
 * rules, a drop cap, a double rule under the masthead. The brand appears only
 * in the kicker and the links, roughly where a real masthead spends its colour.
 */
export function NewspaperDispatch({ articles }: { articles: Article[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  // No `once`: the press stops while the section is off screen.
  const inView = useInView(sectionRef, { amount: 0.25 });
  const reduceMotion = useReducedMotion();

  const [edition, setEdition] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [turning, setTurning] = useState(false);

  const total = articles.length;
  const next = (edition + 1) % total;

  const turnTo = useCallback(
    (target: number) => {
      if (turning) return;
      if (reduceMotion || target === edition) {
        setEdition(target);
        return;
      }
      // Only the following spread can be *turned* to; jumping elsewhere sets
      // the edition outright, the way flicking through a book does.
      if (target === (edition + 1) % total) setTurning(true);
      else setEdition(target);
    },
    [edition, total, turning, reduceMotion]
  );

  useEffect(() => {
    if (!playing || !inView || reduceMotion || total < 2 || turning) return;
    const timer = setTimeout(() => setTurning(true), DWELL);
    return () => clearTimeout(timer);
  }, [edition, playing, inView, reduceMotion, total, turning]);

  /** The sheet has landed: adopt the spread its back was already showing. */
  const commitTurn = () => {
    setEdition(next);
    setTurning(false);
  };

  const spread = (index: number) => {
    const lead = articles[index];
    const briefs = Array.from(
      { length: total - 1 },
      (_, i) => articles[(index + i + 1) % total]
    );
    return { lead, briefs };
  };

  const current = spread(edition);
  const upcoming = spread(next);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-bg py-16 sm:py-20">
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10">
        {/* Rail above the book */}
        <div className="mx-auto mb-6 flex w-full max-w-[1700px] flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
              Off the press
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Latest News &amp; <span className="italic text-brand">Updates</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {articles.map((a, i) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => turnTo(i)}
                  aria-label={`Open edition ${i + 1} of ${total}`}
                  aria-current={i === edition}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === edition ? "w-8 bg-brand" : "w-4 bg-line hover:bg-brand/40"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={!playing}
              aria-label={playing ? "Stop turning pages" : "Turn pages automatically"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-colors hover:border-brand/40 hover:bg-brand hover:text-white"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <Link href="/articles" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
        </div>

        {/* The book */}
        <div className="mx-auto w-full max-w-[1700px]">
          <div className="relative rounded-sm border border-ink/15 bg-[color-mix(in_oklab,var(--color-bg-alt)_82%,#f7efe2)] shadow-[0_50px_120px_-50px_rgba(28,33,40,0.7)]">
            <Masthead edition={edition} total={total} />

            {/* The two boards. Perspective lives here so the sheet hinges in
                the same space the boards occupy. */}
            <div className="relative grid gap-0 sm:grid-cols-2 sm:[perspective:2600px]">
              {/* Left board — the lead story */}
              <div className="relative border-ink/15 px-6 py-8 sm:border-r sm:px-10 sm:py-10">
                <LeadPage lead={current.lead} />
              </div>

              {/* Right board — already set with the next spread while a sheet
                  is travelling over it, so the reveal behind is correct. */}
              <div className="relative px-6 pb-8 pt-0 sm:px-10 sm:py-10">
                <BriefsPage
                  briefs={turning ? upcoming.briefs : current.briefs}
                  edition={turning ? next : edition}
                  total={total}
                />
              </div>

              {/* The travelling sheet */}
              {turning && !reduceMotion && (
                <motion.div
                  className="absolute inset-y-0 right-0 hidden w-1/2 [transform-style:preserve-3d] sm:block"
                  style={{ transformOrigin: "left center", zIndex: 40 }}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -180 }}
                  transition={{ duration: TURN / 1000, ease: [0.42, 0, 0.35, 1] }}
                  onAnimationComplete={commitTurn}
                >
                  {/* Front: the right page being lifted */}
                  <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-bg-alt)_82%,#f7efe2)] px-10 py-10 [backface-visibility:hidden]">
                    <BriefsPage briefs={current.briefs} edition={edition} total={total} />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/12 to-transparent" />
                  </div>

                  {/* Back: the left page of the spread coming in, pre-flipped */}
                  <div className="absolute inset-0 border-ink/15 bg-[color-mix(in_oklab,var(--color-bg-alt)_82%,#f7efe2)] px-10 py-10 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:border-r">
                    <LeadPage lead={upcoming.lead} />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/12 to-transparent" />
                  </div>

                  {/* Paper catching the light as it swings through the arc */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-black"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.18, 0] }}
                    transition={{ duration: TURN / 1000, times: [0, 0.5, 1] }}
                  />
                </motion.div>
              )}

              {/* The spine: a gutter shadow down the centre of the spread */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1/2 z-30 hidden w-14 -translate-x-1/2 bg-[linear-gradient(to_right,transparent,rgba(28,33,40,0.13),rgba(28,33,40,0.04),rgba(28,33,40,0.13),transparent)] sm:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Running head across the whole spread, above the boards — it never turns.
 *
 * No masthead plate: the section already carries its own heading, and a second
 * title directly under it read as the same thing said twice. What is left is
 * the folio line a spread needs to locate itself, closed with the double rule
 * that keeps the print feel.
 */
function Masthead({ edition, total }: { edition: number; total: number }) {
  return (
    <div className="px-6 pt-5 sm:px-10">
      <div className="flex items-center justify-between border-b-4 border-double border-ink/25 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        <span>Vol. XII</span>
        <span className="hidden sm:inline">Campus Desk · India</span>
        <span>
          No. {String(edition + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/** Left board: the lead story, set the way a lead runs in print. */
function LeadPage({ lead }: { lead: Article }) {
  return (
    <article>
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
        Lead story
      </span>

      <h4 className="mt-2 font-display text-2xl font-bold leading-[1.15] tracking-tight text-ink sm:text-[2rem] lg:text-[2.4rem]">
        <Link href={`/articles/${lead.slug}`} className="hover:text-brand">
          {lead.title}
        </Link>
      </h4>

      <div className="relative mt-4 aspect-[16/8] w-full overflow-hidden border border-ink/15 bg-bg-alt grayscale-[35%]">
        <Image
          src={`/images/articles/${lead.slug}.svg`}
          alt={lead.title}
          fill
          sizes="(max-width: 640px) 90vw, 45vw"
          className="object-cover"
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft [column-gap:1.75rem] first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-bold first-letter:leading-[0.8] first-letter:text-ink lg:columns-2">
        {lead.excerpt}
      </p>

      <Link
        href={`/articles/${lead.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand hover:underline"
      >
        Continue reading <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

/** Right board: the rest of the run, ruled off like a sidebar column. */
function BriefsPage({
  briefs,
  edition,
  total,
}: {
  briefs: Article[];
  edition: number;
  total: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
        Also in this edition
      </span>

      <ul className="mt-3 flex-1 divide-y divide-ink/12">
        {briefs.map((brief) => (
          <li key={brief.slug} className="py-4">
            <Link href={`/articles/${brief.slug}`} className="group block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                {brief.date}
              </p>
              <p className="mt-1 font-display text-base font-bold leading-snug text-ink group-hover:text-brand">
                {brief.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{brief.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Folio, as it sits at the foot of a right-hand page */}
      <p className="mt-6 border-t border-ink/15 pt-3 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        Page {String(edition + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
    </div>
  );
}
