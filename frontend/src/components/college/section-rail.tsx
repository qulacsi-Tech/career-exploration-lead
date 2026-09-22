"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The sticky rail across the top of a college's pages.
 *
 * ## It navigates now; it used to scroll
 *
 * Each section of a college is its own URL, per the 15 Sep feedback that
 * "Cutoffs, Courses & Fees, etc. should open on separate pages". So these are
 * real `<Link>`s to real routes rather than `#anchor` jumps within one long
 * document, and the current tab comes from `usePathname()` instead of an
 * IntersectionObserver watching headings go past.
 *
 * Three things went with the observer, and none of them are missed:
 *
 * - The **scroll-spy** itself. There is nothing to spy on when each section is
 *   a page; the URL already says where you are, and it says so correctly on
 *   first paint rather than after the first scroll event.
 * - The **reading-progress bar**, which measured the whole document. Across ten
 *   short pages it would read near-full on every one of them and mean nothing.
 * - A **latent bug**: the old rail's order did not match the DOM order it
 *   claimed to (Reviews sat last in the rail but before Gallery in the
 *   document), so the active tab jumped backwards when scrolling past Reviews.
 *   Route tabs cannot drift from document order because there is no document
 *   order to drift from.
 *
 * `sections` is built on the server from what this college actually has
 * (`lib/college-sections.ts`), so a college with no videos never gets a dead
 * Videos link — and the same predicate 404s the route, so the two cannot
 * disagree.
 */
export function SectionRail({
  sections,
  collegeSlug,
}: {
  /** Ordered. `href` is the section's full path. */
  sections: { slug: string; label: string; href: string }[];
  collegeSlug: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  /*
    Exact match, not `startsWith`.

    The overview's href is `/college/<slug>`, which every section path begins
    with — a prefix test would light up Overview on all ten pages. Trailing
    slashes are trimmed so `/college/x/` still matches `/college/x`.
  */
  const current = pathname.replace(/\/$/, "");

  return (
    <nav
      aria-label="College sections"
      /* top-[86px] clears the site header, which is sticky at top-0 and runs
         about that tall once the logo is at its lg size. */
      className="sticky top-[86px] z-30 border-y border-line bg-surface/85 backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const isActive = current === section.href.replace(/\/$/, "");

          return (
            <li key={section.slug || "overview"} className="shrink-0">
              <Link
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative block whitespace-nowrap px-4 py-4 text-sm font-semibold transition-colors ${
                  isActive ? "text-brand" : "text-ink-soft hover:text-ink"
                }`}
              >
                {section.label}
                {isActive && (
                  /* One shared layoutId, so the underline slides between links
                     rather than each one fading its own in and out. The rail
                     lives in the layout, so it survives the navigation and the
                     slide actually plays. */
                  <motion.span
                    layoutId={`college-rail-underline-${collegeSlug}`}
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 32 }
                    }
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
