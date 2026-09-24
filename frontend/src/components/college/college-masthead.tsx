"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Bookmark,
  Clock,
  Download,
  GitCompareArrows,
  Images,
  MapPin,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import { useCompare } from "@/components/compare-tray";
import { Stars } from "@/components/college/detail-ui";

/**
 * The top of every college page: campus photograph, identity, actions, tabs.
 *
 * ## A framed photograph, not a full-bleed scene
 *
 * The previous hero filled the viewport, which put the college's name, rating
 * and tabs below the fold on a laptop. Here the photograph is a contained
 * banner and the identity card sits directly under it, laid out as the
 * Shiksha reference: keyword title, location | rating | Q&A, chips, then Save,
 * Compare and Brochure, with the tab rail closing the card.
 *
 * ## The rail condenses rather than a second header appearing
 *
 * Once the title block scrolls under the site header, the sticky tab rail grows
 * a compact row carrying the name, the rating, Brochure and Apply. That keeps the one
 * action that matters in reach on a long section without stacking a second
 * sticky bar on top of the rail.
 *
 * Lives in the layout, so it stays mounted between tabs: the photograph does
 * not reload and the tab underline slides rather than cuts.
 */

export type MastheadSection = { slug: string; label: string; href: string };

/** The site header is sticky at top-0 and about this tall at lg. */
const HEADER_OFFSET = 86;

/*
  Save: a per-browser shortlist in localStorage, read through an external
  store so the server and first client render agree (nothing saved) and the
  stored state arrives through the snapshot rather than a setState in an
  effect. The snapshot is the raw string — a primitive, so it compares stable.
*/
const SAVED_KEY = "tcp:saved-colleges";
const savedListeners = new Set<() => void>();

function subscribeSaved(listener: () => void) {
  savedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    savedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function savedSnapshot(): string {
  try {
    return localStorage.getItem(SAVED_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseSaved(raw: string): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function toggleSavedSlug(slug: string) {
  const list = parseSaved(savedSnapshot());
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    /* Private mode: nothing to persist to, and nothing worth failing over. */
  }
  savedListeners.forEach((listener) => listener());
}

export function CollegeMasthead({
  slug,
  name,
  title,
  city,
  state,
  ownership,
  established,
  approvals,
  rating,
  reviewCount,
  averagePackage,
  qnaCount,
  photo,
  monogram,
  mediaCount,
  sections,
  updatedOn,
}: {
  slug: string;
  /** Full name — the banner's alt text and the condensed bar. */
  name: string;
  /** "BIMS Bengaluru: Courses, Fees, Admission 2027, …" — the h1. */
  title: string;
  city: string;
  state: string;
  ownership: string;
  established: number;
  approvals: string[];
  rating: number;
  reviewCount: number;
  /** "₹14.2 LPA" — shown in the meta line in place of the rating. */
  averagePackage: string;
  qnaCount: number;
  photo: string;
  monogram: string;
  /** Photos and videos, for the banner chip. Zero hides it. */
  mediaCount: { photos: number; videos: number };
  sections: MastheadSection[];
  /** Pre-formatted on the server, so client and static HTML agree. */
  updatedOn: string;
}) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const current = pathname.replace(/\/$/, "");

  /* ---- condensed rail ---- */
  const titleRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_OFFSET),
      { rootMargin: `-${HEADER_OFFSET}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ---- active tab kept in view on narrow screens ---- */
  const railRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    /* Horizontal only — `scrollIntoView` would also scroll the page down to a
       rail that starts below the fold on a phone. */
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !active) return;
    rail.scrollTo({
      left: active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [current, reduceMotion]);

  /* ---- save: a per-browser shortlist ---- */
  const savedRaw = useSyncExternalStore(subscribeSaved, savedSnapshot, () => "");
  const saved = parseSaved(savedRaw).includes(slug);

  /* ---- compare: the site-wide tray ---- */
  const { isSelected, isFull, toggle } = useCompare();
  const comparing = isSelected(slug);
  const compareDisabled = !comparing && isFull;

  const hrefOf = (section: string) => sections.find((s) => s.slug === section)?.href ?? "#";
  const mediaLabel = [
    mediaCount.videos ? `${mediaCount.videos} Video${mediaCount.videos > 1 ? "s" : ""}` : "",
    mediaCount.photos ? `${mediaCount.photos} Photo${mediaCount.photos > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const outline =
    "inline-flex items-center justify-center gap-2 rounded-full border border-ink/60 bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        {/* Banner */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-t-3xl bg-bg-alt sm:aspect-[21/7]">
            <Image
              src={photo}
              alt={`${name} campus`}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
            />
            {mediaLabel && (
              <Link
                href={hrefOf("gallery")}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-black/70 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/85"
              >
                <Images className="h-4 w-4" />
                {mediaLabel}
              </Link>
            )}
          </div>

          {/* Logo tile. No logos in the data, so the college's initials. */}
          <div className="absolute -bottom-8 left-5 z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface p-1.5 shadow-lg sm:left-8 sm:h-20 sm:w-20">
            <span className="flex h-full w-full items-center justify-center rounded-xl bg-brand-soft font-display text-base font-extrabold tracking-tight text-brand-ink sm:text-lg">
              {monogram}
            </span>
          </div>
        </motion.div>

        {/* Identity + actions — the top half of the card the rail completes. */}
        <div
          ref={titleRef}
          className="grid gap-5 border-x border-line bg-surface px-5 pb-5 pt-11 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="min-w-0"
          >
            <h1 className="font-display text-xl font-bold leading-snug tracking-tight text-ink sm:text-[1.375rem]">
              {title}
            </h1>

            <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  <Link href={`/location/${city.toLowerCase()}`} className="text-brand hover:underline">
                    {city}
                  </Link>
                  , {state}
                </span>
              </span>
              <span aria-hidden className="h-3.5 w-px bg-line" />
              <Link
                href={hrefOf("placements")}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <TrendingUp className="h-3.5 w-3.5 text-brand" />
                Avg. Package
                <span className="font-semibold text-brand">{averagePackage}</span>
              </Link>
              <span aria-hidden className="h-3.5 w-px bg-line" />
              <Link
                href={hrefOf("qna")}
                className="inline-flex items-center gap-1.5 text-brand hover:underline"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                {qnaCount} Student Q&amp;A
              </Link>
            </p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {[`${ownership} Institute`, `Estd. ${established}`, ...approvals].map((chip) => (
                <li key={chip} className="rounded bg-bg-alt px-2 py-0.5 text-xs text-ink-soft">
                  {chip}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap gap-2.5 lg:justify-end"
          >
            <button
              type="button"
              onClick={() => toggleSavedSlug(slug)}
              aria-pressed={saved}
              className={`${outline} ${saved ? "border-brand text-brand" : ""}`}
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => toggle(slug)}
              disabled={compareDisabled}
              aria-pressed={comparing}
              title={compareDisabled ? "The compare tray is full" : undefined}
              className={`${outline} disabled:cursor-not-allowed disabled:opacity-40 ${
                comparing ? "border-brand text-brand" : ""
              }`}
            >
              <GitCompareArrows className="h-4 w-4" />
              {comparing ? "Added" : "Compare"}
            </button>
            <Link
              href="/enquiry"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <Download className="h-4 w-4" />
              Brochure
            </Link>
          </motion.div>
        </div>
      </div>

      {/*
        The rail — the bottom half of the same card. A sibling of the card
        rather than inside it, because a sticky element cannot outlive its
        parent's box: inside the card it would stop sticking the moment the
        card scrolled away. Once stuck, it spans the viewport.
      */}
      <nav
        aria-label="College sections"
        className={`sticky top-[86px] z-30 transition-colors ${
          condensed ? "border-b border-line bg-surface/95 shadow-sm backdrop-blur-xl" : ""
        }`}
      >
        <AnimatePresence initial={false}>
          {condensed && (
            <motion.div
              key="compact"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-b border-line-soft"
            >
              <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold text-ink sm:text-xl">
                    {name}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-ink-soft sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {city}
                    </span>
                    <span aria-hidden>&bull;</span>
                    <Stars score={rating} className="h-3.5 w-3.5" />
                    <span>{reviewCount.toLocaleString("en-IN")}</span>
                  </p>
                </div>
                <Link
                  href="/enquiry"
                  className="hidden shrink-0 items-center gap-2 rounded-full border border-ink/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand sm:inline-flex"
                >
                  <Download className="h-4 w-4" />
                  Brochure
                </Link>
                <Link
                  href="/enquiry"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
                >
                  Apply Now
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ul
            ref={railRef}
            className={`flex overflow-x-auto bg-surface px-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden ${
              condensed ? "" : "rounded-b-3xl border border-line"
            }`}
          >
            {sections.map((section) => {
              /* Exact match: every section path starts with the overview's. */
              const isActive = current === section.href.replace(/\/$/, "");
              return (
                <li key={section.slug || "overview"} className="shrink-0">
                  <Link
                    href={section.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative block whitespace-nowrap px-2 py-4 text-sm transition-colors xl:px-2.5 ${
                      isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {section.label}
                    {isActive && (
                      <motion.span
                        layoutId={`college-rail-underline-${slug}`}
                        className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-brand-ink"
                        transition={
                          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }
                        }
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <p className="mx-auto flex max-w-7xl items-center gap-2 px-6 pt-4 text-sm text-ink-soft sm:px-8 lg:px-12">
        <Clock className="h-3.5 w-3.5" />
        Last updated on <span className="font-medium text-ink">{updatedOn}</span>
      </p>
    </>
  );
}
