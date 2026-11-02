"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { DetailCard } from "@/components/college/detail-ui";
import { videoEmbedUrl } from "@/lib/college-content";
import { mediaUrl } from "@/lib/media";
import type { CollegeGalleryItem, CollegeVideoItem } from "@/lib/api";

/**
 * The Gallery tab: the photos as a grid and the videos below it, and any of them opens in a full-size viewer.
 * Photos and videos share one sequence (photos first, then videos), so Previous and Next, the arrow keys or a
 * swipe step through all of them. Escape or a click outside closes it. The page behind does not scroll while it
 * is open.
 */

type Item =
  | { kind: "photo"; photo: CollegeGalleryItem }
  | { kind: "video"; video: CollegeVideoItem };

export function GalleryViewer({ photos, videos }: { photos: CollegeGalleryItem[]; videos: CollegeVideoItem[] }) {
  const items: Item[] = [...photos.map((photo) => ({ kind: "photo" as const, photo })), ...videos.map((video) => ({ kind: "video" as const, video }))];
  const [at, setAt] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = (index: number) => {
    opener.current = document.activeElement as HTMLElement | null;
    setAt(index);
  };
  const close = useCallback(() => {
    setAt(null);
    opener.current?.focus();
  }, []);
  const step = useCallback((by: 1 | -1) => setAt((i) => (i === null ? i : (i + by + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (at === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [at, close, step]);

  const current = at === null ? null : items[at];
  const caption = current ? (current.kind === "photo" ? current.photo.name || current.photo.alt : current.video.title) : "";
  // The neighbours are fetched ahead, so stepping to them shows the picture at once.
  const neighbours = at === null ? [] : [items[(at + 1) % items.length], items[(at - 1 + items.length) % items.length]];

  return (
    <>
      {photos.length > 0 && (
        <DetailCard title={`Photos (${photos.length})`}>
          {/* The first frame runs two columns wide, so the eye has somewhere to land instead of reading equal tiles left to right. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((image, i) => (
              <figure key={image.src} className={`group relative overflow-hidden rounded-xl bg-bg-alt ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}>
                <button type="button" onClick={() => open(i)} aria-label={`View ${image.name || image.alt || `photo ${i + 1}`} full size`} className="relative block h-full w-full cursor-zoom-in text-left">
                  <span className={`relative block ${i === 0 ? "aspect-[16/10] h-full" : "aspect-[4/3]"}`}>
                    <Image
                      src={mediaUrl(image.src)}
                      alt={image.alt}
                      fill
                      // An uploaded photo is served by the API on another origin, which the optimizer is not set up for.
                      unoptimized={mediaUrl(image.src).startsWith("http")}
                      sizes={i === 0 ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, 33vw"}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </span>
                  {/* Always-on caption: a hover-only one is unreachable on touch. */}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 block p-3.5 text-sm font-semibold text-white">{image.name || image.alt}</span>
                  <span aria-hidden className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </button>
              </figure>
            ))}
          </div>
        </DetailCard>
      )}

      {videos.length > 0 && (
        <DetailCard title={`Videos (${videos.length})`}>
          {/* Lazy iframes: an eager one pulls the provider's player on every page load, for content below the fold. */}
          <div className="grid gap-6 sm:grid-cols-2">
            {videos.map((video, i) => (
              <figure key={`${video.provider}-${video.videoId}`}>
                <div className="group relative aspect-video overflow-hidden rounded-xl bg-bg-alt">
                  <iframe
                    src={videoEmbedUrl(video)}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                  <button
                    type="button"
                    onClick={() => open(photos.length + i)}
                    aria-label={`View ${video.title} larger`}
                    className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-black/75 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
                <figcaption className="mt-2.5 text-sm font-medium text-ink">{video.title}</figcaption>
              </figure>
            ))}
          </div>
        </DetailCard>
      )}

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Gallery viewer" className="fixed inset-0 z-[80] flex flex-col bg-black/90" onClick={close}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 truncate text-sm font-semibold">{caption}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums text-white/80" aria-live="polite">
                {at! + 1} / {items.length}
              </span>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            }}
          >
            <div className="flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {current.kind === "photo" ? (
                // Plain img: the picture is shown at the largest size that fits, uncropped. An upload is served by the API's origin.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={current.photo.src} src={mediaUrl(current.photo.src)} alt={current.photo.alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
              ) : (
                <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl">
                  <iframe
                    key={`${current.video.provider}-${current.video.videoId}`}
                    src={videoEmbedUrl(current.video)}
                    title={current.video.title}
                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-4"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-4"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Preloads the pictures either side. */}
          <div aria-hidden className="hidden">
            {neighbours.map((n, i) =>
              n.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={mediaUrl(n.photo.src)} alt="" />
              ) : null,
            )}
          </div>
        </div>
      )}
    </>
  );
}
