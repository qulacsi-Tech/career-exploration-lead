"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * The sticky in-page rail: reading progress on top, section links below.
 *
 * Still plain `<a href="#id">` anchors, deliberately. The sections they point
 * at are all in the document at all times — none of this switches panels — so
 * the whole page stays indexable and a shared link to #placements still lands
 * in the right place with JavaScript off. The rail only adds a *read-out* of
 * where you already are.
 *
 * ## Which section counts as current
 *
 * An IntersectionObserver with a `-45% 0px -50% 0px` root margin, which
 * collapses the viewport to a thin band just above the middle: whichever
 * section crosses that band is the one being read. Comparing `getBoundingRect`
 * on every scroll event would give the same answer far more expensively, and
 * naive "topmost visible section" flips to the next heading the instant it
 * appears at the bottom edge, while the visitor is still reading the previous
 * one.
 *
 * `sections` is built on the server from what this college actually has, so a
 * college with no videos never gets a dead Videos link.
 */
export function SectionRail({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  /* Spring-smoothed: the raw value steps with each scroll event, which shows
     up as a stuttering bar on a trackpad. */
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /* Several sections can be inside the band at once on a short screen —
           take the one furthest down the page, which is the one just scrolled
           into. */
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="On this page"
      /* top-[86px] clears the site header, which is sticky at top-0 and runs
         about that tall once the logo is at its lg size. */
      className="sticky top-[86px] z-30 border-y border-line bg-surface/85 backdrop-blur-xl"
    >
      {/* Reading progress. Full page, not this section — it answers "how much
          of this college is left", which is the question on a page this long. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-brand"
        style={{ scaleX: reduceMotion ? 1 : progress }}
      />

      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`relative block whitespace-nowrap px-4 py-4 text-sm font-semibold transition-colors ${
                  isActive ? "text-brand" : "text-ink-soft hover:text-ink"
                }`}
              >
                {section.label}
                {isActive && (
                  /* One shared layoutId, so the underline slides between links
                     rather than each one fading its own in and out. */
                  <motion.span
                    layoutId="college-rail-underline"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 32 }
                    }
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
