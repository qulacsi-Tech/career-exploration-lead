"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Clock, IndianRupee, Layers } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/college/reveal";

/**
 * Courses as an interactive card grid.
 *
 * This replaced a five-column table. The table was honest but it asked a
 * visitor to read across a row to assemble one programme's story — and on a
 * phone it was a 560px-wide box scrolling sideways inside the page, which is
 * the worst version of that. A card holds one programme, so the duration, the
 * fee and the entrance exams are read together.
 *
 * ## The expansion
 *
 * The headline facts — duration, mode, fee — are always visible; the entrance
 * exams and the CTA are behind a toggle. That split is deliberate: the first
 * three are what a visitor scans to compare programmes, the rest is what they
 * read once they have chosen one. Showing everything makes every card tall
 * enough that only two fit on screen and nothing can be compared at all.
 *
 * It is a real `<button>` with `aria-expanded` and `aria-controls`, not a
 * div with an onClick — this has to work from the keyboard, and the panel it
 * opens has to be announced as belonging to it.
 *
 * `height: auto` in the animation lets framer measure the panel rather than
 * making us hard-code a height that breaks the moment a course accepts five
 * exams instead of two.
 */

export type CourseCardItem = {
  name: string;
  duration: string;
  mode: string;
  fees: string;
  exams: string[];
};

export function CourseCards({ courses }: { courses: CourseCardItem[] }) {
  /* One open at a time. Several cards expanded at once reflows the grid under
     the reader's cursor, and the comparison the grid exists for is lost. */
  const [open, setOpen] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <RevealGroup className="grid gap-5 sm:grid-cols-2">
      {courses.map((course) => {
        const isOpen = open === course.name;
        const panelId = `course-panel-${course.name.replace(/\s+/g, "-").toLowerCase()}`;

        return (
          <RevealItem key={course.name}>
            <article
              className={`group relative h-full overflow-hidden rounded-3xl border bg-surface transition-all duration-500 ${
                isOpen
                  ? "border-brand/50 shadow-xl shadow-brand/5"
                  : "border-line hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
              }`}
            >
              {/* A brand wash that rises from the bottom on hover — the card
                  warming up rather than a border colour flicking over. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0 bg-gradient-to-t from-brand-soft/70 to-transparent transition-all duration-500 group-hover:h-32"
              />

              <div className="relative p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold leading-snug text-ink">
                    {course.name}
                  </h3>
                  <span className="shrink-0 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand-ink">
                    {course.mode}
                  </span>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-brand" />
                    <dt className="sr-only">Duration</dt>
                    <dd className="text-ink-soft">{course.duration}</dd>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IndianRupee className="h-4 w-4 shrink-0 text-brand" />
                    <dt className="sr-only">Fees</dt>
                    <dd className="font-semibold text-ink">{course.fees}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : course.name)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="mt-5 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-bg-alt px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Entrance &amp; apply
                  </span>
                  <motion.span
                    animate={reduceMotion ? undefined : { rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      key="panel"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                          Exams accepted
                        </p>
                        <ul className="mt-2.5 flex flex-wrap gap-2">
                          {course.exams.map((exam) => (
                            <li
                              key={exam}
                              className="rounded-full border border-line bg-bg-alt px-3 py-1 text-xs font-semibold text-ink-soft"
                            >
                              {exam}
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/enquiry"
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                        >
                          Apply for {course.name}
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </article>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
