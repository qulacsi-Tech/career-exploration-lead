"use client";

import { useRef } from "react";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

export function LocationCarousel({
  locations,
}: {
  locations: { slug: string; name: string; collegeCount: number }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={trackRef} className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2">
        {locations.map((loc) => (
          <Link
            key={loc.slug}
            href={`/location/${loc.slug}`}
            className="flex min-w-[160px] shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition hover:border-brand/40 hover:shadow-sm"
          >
            <ImagePlaceholder label={`${loc.name} photo`} rounded="rounded-full" className="h-16 w-16" />
            <div>
              <p className="font-medium text-ink">{loc.name}</p>
              <p className="text-xs text-ink-faint">{loc.collegeCount} colleges</p>
            </div>
          </Link>
        ))}
      </div>

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
