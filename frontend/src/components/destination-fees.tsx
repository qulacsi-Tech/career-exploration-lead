"use client";

import { useEffect, useState } from "react";

/*
  The fees panel on a destination card: the average package on the left, and the
  course categories with their fee ranges sliding up one at a time on the right.

  Keeping the average still and sliding only the courses leaves one steady figure to
  anchor on, and the slide is slow (about every 4.5 seconds, with a long, soft move)
  so each course can be read before the next arrives. It stops while the pointer is
  over it.

  The card around it is a link, so the dots are only an indicator and are not buttons:
  a button inside a link would send the click to the link. Every course's text stays in
  the page, so none of it is hidden from screen readers or search engines. For visitors
  who ask their system for reduced motion nothing slides: the courses are listed one
  under another (see `.fees-viewport` and `.fees-track` in globals.css).
*/

const DWELL_MS = 4500;

export type CourseFeeRow = { category: string; fees: string };

export function DestinationFees({
  averageLabel,
  average,
  coursesLabel,
  courses,
}: {
  averageLabel: string;
  average: string;
  coursesLabel: string;
  courses: CourseFeeRow[];
}) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  const count = courses.length;
  const many = count > 1;
  // A course removed while the page is open must not leave the track pointing at nothing.
  const current = count > 0 ? Math.min(active, count - 1) : 0;

  useEffect(() => {
    if (!many || held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), DWELL_MS);
    return () => clearTimeout(timer);
  }, [current, many, held, count]);

  if (!average && count === 0) return null;

  return (
    <div
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      className={`grid overflow-hidden rounded-2xl border border-line bg-bg-alt/70 ${
        average && count > 0 ? "grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] divide-x divide-line" : "grid-cols-1"
      }`}
    >
      {average && (
        <div className="min-w-0 px-4 py-3.5 sm:px-5">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">{averageLabel}</p>
          <p className="mt-1.5 truncate font-display text-xl font-medium tracking-tight text-ink sm:text-2xl lg:text-[1.7rem]">
            {average}
          </p>
        </div>
      )}

      {count > 0 && (
        <div className="min-w-0 px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">{coursesLabel}</p>
            {many && (
              <span aria-hidden="true" className="fees-dots flex shrink-0 items-center gap-1">
                {courses.map((row, i) => (
                  <span
                    key={`${row.category}-${row.fees}`}
                    className={`h-1 rounded-full transition-all duration-700 ${i === current ? "w-4 bg-brand" : "w-1 bg-line"}`}
                  />
                ))}
              </span>
            )}
          </div>

          {/* One row tall; the track slides up so each course takes its turn. */}
          <div className="fees-viewport mt-1.5 h-[var(--fees-row)] overflow-hidden [--fees-row:2.25rem] sm:[--fees-row:2.5rem]">
            <div
              className="fees-track transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateY(calc(var(--fees-row) * -${current}))` }}
            >
              {courses.map((row) => (
                <p key={`${row.category}-${row.fees}`} className="fees-row flex h-[var(--fees-row)] items-center gap-2.5">
                  <span className="min-w-0 shrink truncate text-sm font-medium text-ink-soft">{row.category}</span>
                  <span className="truncate font-display text-xl font-medium tracking-tight text-ink sm:text-2xl lg:text-[1.7rem]">{row.fees}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
