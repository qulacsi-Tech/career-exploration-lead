"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function LocationCarousel({
  locations,
}: {
  locations: { slug: string; name: string; collegeCount: number }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  /*
    The arrows are only meaningful while the track actually overflows
    horizontally. With six cards on a desktop width it does not, and a pair of
    dead arrows at the container edges is what made this row look off-centre.
    Below sm the container is a vertical grid, so it never overflows sideways
    and this stays false there too — which is right, the grid scrolls itself.
  */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => setCanScroll(el.scrollWidth > el.clientWidth + 1);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [locations.length]);

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/*
        Two layouts, one set of markup — only the container's display changes.

        Below sm: a two-column grid in a fixed-height box that scrolls
        vertically. A sideways strip on a phone hides most of the list off-screen
        with no affordance saying so; a grid shows six at a glance and scrolls
        the rest.

        sm and up: the horizontal snap track. `safe center` rather than plain
        centring — it centres the cards while they fit but falls back to
        flex-start once the track overflows, where plain `justify-center` would
        push the first card past the scroll origin and leave it unreachable.
      */}
      <div
        ref={trackRef}
        className="grid max-h-80 snap-y grid-cols-2 gap-3 overflow-x-hidden overflow-y-auto scroll-smooth pb-2 sm:flex sm:max-h-none sm:snap-x sm:gap-4 sm:overflow-x-auto sm:overflow-y-auto sm:[justify-content:safe_center]"
      >
        {locations.map((loc) => (
          <Link
            key={loc.slug}
            href={`/location/${loc.slug}`}
            className="group flex w-full shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-brand/40 hover:shadow-sm sm:w-auto sm:min-w-[160px] sm:p-5"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-line bg-bg-alt shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Image
                src={`/images/locations/${loc.slug}.jpg`}
                alt={`${loc.name} photo`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-ink group-hover:text-brand">{loc.name}</p>
              <p className="text-xs text-ink-faint">{loc.collegeCount} colleges</p>
            </div>
          </Link>
        ))}
      </div>

      {canScroll && (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface p-2 text-ink-soft shadow-sm hover:text-brand sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 hidden translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface p-2 text-ink-soft shadow-sm hover:text-brand sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d={direction === "left" ? "M12 15l-5-5 5-5" : "M8 15l5-5-5-5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
