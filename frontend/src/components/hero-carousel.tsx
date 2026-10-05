"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { HeroBackdrop } from "@/app/(site)/hero-backdrop";

/*
  The homepage hero: one slide shows plain, several rotate.

  Every slide's picture and words are stacked in the same place and cross-fade, so
  the hero never changes height between slides. `children` is the search box, which
  stays put underneath.

  It rotates every few seconds and stops by itself while the pointer or keyboard focus
  is inside the hero, so there is no Pause button to find. It does not run at all for
  visitors who ask their system for reduced motion. Previous and Next buttons and the
  dots are always there when there is more than one slide. With a single slide there
  are no controls and nothing moves.

  Only the visible slide's words are a heading and are read by screen readers; the
  others are hidden, so the page keeps exactly one h1.
*/

const DWELL_MS = 3000;

export function HeroCarousel({ items, children }: { items: HeroItem[]; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  const count = items.length;
  const many = count > 1;
  // An item removed while the page is open must not leave `active` pointing at nothing.
  const current = count > 0 ? Math.min(active, count - 1) : 0;

  const go = useCallback((dir: 1 | -1) => setActive((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (!many || held || reduceMotion) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), DWELL_MS);
    return () => clearTimeout(timer);
  }, [current, many, held, reduceMotion, count]);

  return (
    <section
      className="relative overflow-hidden bg-brand-ink"
      aria-roledescription={many ? "carousel" : undefined}
      aria-label={many ? "Featured" : undefined}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {count === 0 ? (
        <HeroBackdrop />
      ) : (
        items.map((item, i) => (
          <div
            key={item.id}
            aria-hidden={i !== current}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
          >
            {item.image ? (
              // The picture comes from the API's own uploads, so it is a plain img rather than next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(item.image)}
                alt={i === current ? item.imageAlt : ""}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <HeroBackdrop />
            )}
          </div>
        ))
      )}

      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/40" />

      <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        {count > 0 && (
          // One grid cell holds every slide's words, so the tallest sets the height.
          <div className="grid" aria-live={many && held ? "polite" : "off"}>
            {items.map((item, i) => {
              const visible = i === current;
              const Heading = visible ? "h1" : "p";
              return (
                <div
                  key={item.id}
                  aria-hidden={!visible}
                  className={`col-start-1 row-start-1 transition-opacity duration-700 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <Heading className="font-display balance text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
                    {item.headline}
                  </Heading>
                  <p className="mx-auto mt-4 max-w-xl text-white/90">{item.subheadline}</p>
                </div>
              );
            })}
          </div>
        )}

        {children}
      </div>

      {many && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex lg:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex lg:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Go to slide ${i + 1} of ${count}`}
                  aria-current={i === current}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
