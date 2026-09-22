"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { College } from "@/lib/mock-data";
import { TopCollegeCard } from "@/components/top-college-card";

/**
 * A homepage college band that does not fit in one row.
 *
 * Used when a band holds more than three colleges — the client asked for a
 * slider able to carry ten, and ten cards stacked into a three-wide grid is
 * four rows of homepage nobody scrolls to the end of.
 *
 * ## It does not advance on its own
 *
 * Deliberate. The brief asked for a slider so that ten colleges *fit*, not for
 * motion. A band that moves while somebody is reading the third card is the
 * same complaint that took the animation off the streams section, and it would
 * also pull a card out from under a cursor mid-click. Arrows, dots and keyboard
 * only — every advance is something a visitor asked for.
 *
 * ## Scroll-snap rather than a transform
 *
 * The track is a real overflow container with `scroll-snap`, moved by
 * `scrollTo`. That buys trackpad and touch swiping free and correct, keeps the
 * cards in the tab order without any `tabIndex` bookkeeping, and means the
 * browser — not us — decides what a "page" is at each breakpoint. A translated
 * track would need all three rebuilt by hand, and would still fight a native
 * swipe on mobile.
 */

export function CollegeSlider({
  colleges,
  label,
}: {
  colleges: College[];
  /** Names the region for screen readers, e.g. the band's heading. */
  label: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const headingId = useId();

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  /*
    Derived from measurement, not from a hardcoded cards-per-view: the grid is
    1 / 2 / 3 across the breakpoints, and reading the real scroll width keeps
    the dots honest at every size without duplicating the breakpoints here.
  */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const { scrollLeft, scrollWidth, clientWidth } = track;
    // 1px of slack: fractional layout widths mean scrollLeft rarely lands
    // exactly on the end, and a permanently-enabled Next arrow looks broken.
    setAtStart(scrollLeft <= 1);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);

    const pages = Math.max(1, Math.ceil(scrollWidth / clientWidth));
    setPageCount(pages);
    setPage(Math.min(pages - 1, Math.round(scrollLeft / clientWidth)));
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;

    track.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  }, []);

  const scrollToPage = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }, []);

  return (
    <section aria-roledescription="carousel" aria-labelledby={headingId} className="mt-10">
      <h3 id={headingId} className="sr-only">
        {label}
      </h3>

      <div className="relative">
        <ul
          ref={trackRef}
          /*
            `snap-x snap-mandatory` with per-card snap points, and the scrollbar
            hidden because the arrows and dots already say there is more. Cards
            are sized by basis rather than a grid so they can overflow.
          */
          className="slider-track flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollByPage(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByPage(-1);
            }
          }}
        >
          {colleges.map((college, index) => (
            <li
              key={college.slug}
              className="w-full shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
              aria-label={`${index + 1} of ${colleges.length}`}
            >
              <TopCollegeCard college={college} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <SliderButton
          direction="prev"
          disabled={atStart}
          onClick={() => scrollByPage(-1)}
        />

        <ul className="flex items-center gap-2" role="list">
          {Array.from({ length: pageCount }, (_, index) => {
            const active = index === page;
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => scrollToPage(index)}
                  aria-label={`Go to slide group ${index + 1} of ${pageCount}`}
                  aria-current={active ? "true" : undefined}
                  className={`h-2 rounded-full transition-all ${
                    active ? "w-6 bg-brand" : "w-2 bg-line hover:bg-ink-faint"
                  }`}
                />
              </li>
            );
          })}
        </ul>

        <SliderButton direction="next" disabled={atEnd} onClick={() => scrollByPage(1)} />
      </div>

      {/* Position readout for screen readers. Polite, so it does not interrupt
          whatever is being read when the track moves. */}
      <p aria-live="polite" className="sr-only">
        Showing group {page + 1} of {pageCount}
      </p>
    </section>
  );
}

function SliderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous colleges" : "Next colleges"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink-soft"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
