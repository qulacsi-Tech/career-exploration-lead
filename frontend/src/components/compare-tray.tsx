"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { colleges } from "@/lib/mock-data";
import { MAX_COMPARE, compareUrl } from "@/lib/comparison-data";

/**
 * The compare tray: pick 2–3 colleges anywhere on the site, then open the
 * comparison.
 *
 * ## Why an external store rather than context + state
 *
 * The selection lives in sessionStorage, which makes it exactly what
 * `useSyncExternalStore` is for: state owned outside React that components
 * subscribe to. The obvious alternative — `useState` seeded from storage inside
 * an effect — is wrong twice over. It cannot read storage during the first
 * render (the server has none, so the markup would not match), and setting
 * state in an effect to catch up triggers a second render pass on every mount.
 *
 * With a store, the server and the first client render both see an empty tray,
 * React subscribes, and the stored selection arrives through the normal
 * snapshot path. No context provider is needed either: any component can read
 * the store directly, so a checkbox on a listing card and the bar fixed to the
 * viewport share state without a wrapper between them.
 *
 * ## Session, not local
 *
 * A shortlist in progress is a task. A tray that reappears a week later holding
 * three colleges someone has since dismissed is noise, so the scope matches how
 * long the intent lasts.
 *
 * Every storage access is wrapped: Safari's private mode throws on write, and a
 * comparison tray is not worth taking the page down for.
 */

const STORAGE_KEY = "tcp:compare";

/** Stable empty array — a new [] each call would loop the snapshot check. */
const EMPTY: string[] = [];

let slugs: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Filtered against the directory: a stored slug for a college that has
    // since been removed would otherwise sit in the tray unrenderable.
    const valid = parsed
      .filter((s): s is string => typeof s === "string")
      .filter((s) => colleges.some((c) => c.slug === s))
      .slice(0, MAX_COMPARE);

    return valid.length > 0 ? valid : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode: the tray works, it just does not survive a reload */
  }
}

function subscribe(listener: () => void) {
  // First subscription is the earliest point storage can safely be read — it
  // only runs on the client, and after the first render has committed.
  if (!hydrated) {
    hydrated = true;
    slugs = readStorage();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => slugs;

/** The server has no tray. Must be a stable reference, hence EMPTY. */
const getServerSnapshot = () => EMPTY;

function setSlugs(next: string[]) {
  slugs = next.length > 0 ? next : EMPTY;
  writeStorage(slugs);
  listeners.forEach((listener) => listener());
}

export function useCompare() {
  const selection = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    slugs: selection,
    isSelected: (slug: string) => selection.includes(slug),
    isFull: selection.length >= MAX_COMPARE,
    toggle: (slug: string) => {
      if (selection.includes(slug)) {
        setSlugs(selection.filter((s) => s !== slug));
      } else if (selection.length < MAX_COMPARE) {
        setSlugs([...selection, slug]);
      }
    },
    remove: (slug: string) => setSlugs(selection.filter((s) => s !== slug)),
    clear: () => setSlugs(EMPTY),
  };
}

/**
 * Renders the tray alongside the site. Not a context provider — the store needs
 * no wrapper — but the tray has to be mounted somewhere above the routes so it
 * survives navigation, and the layout is that place.
 */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CompareTray />
    </>
  );
}

/**
 * The checkbox that goes on a college card.
 *
 * Disabled at the cap rather than silently dropping the oldest selection: a
 * tray that quietly swaps out a college the visitor picked is worse than one
 * that says it is full.
 */
export function CompareToggle({ slug, className }: { slug: string; className?: string }) {
  const { isSelected, isFull, toggle } = useCompare();
  const selected = isSelected(slug);
  const disabled = !selected && isFull;

  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 text-xs font-medium ${
        disabled ? "cursor-not-allowed text-ink-faint opacity-50" : "text-ink-soft"
      } ${className ?? ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() => toggle(slug)}
        className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand"
      />
      {selected ? "Added" : "Compare"}
    </label>
  );
}

function CompareTray() {
  const { slugs: selection, remove, clear } = useCompare();
  if (selection.length === 0) return null;

  const selected = selection
    .map((slug) => colleges.find((c) => c.slug === slug))
    .filter((c): c is (typeof colleges)[number] => c !== undefined);

  const ready = selected.length >= 2;

  return (
    <div
      role="region"
      aria-label="Colleges selected for comparison"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Comparing
        </span>

        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {selected.map((college) => (
            <li
              key={college.slug}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink"
            >
              <span className="max-w-40 truncate">{college.name}</span>
              <button
                type="button"
                onClick={() => remove(college.slug)}
                aria-label={`Remove ${college.name} from comparison`}
                className="text-ink-faint transition hover:text-brand"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={clear}
          className="text-xs font-medium text-ink-faint transition hover:text-brand"
        >
          Clear
        </button>

        {ready ? (
          <Link
            href={compareUrl(selection)}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Compare {selected.length}
          </Link>
        ) : (
          <span className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-faint">
            Add one more
          </span>
        )}
      </div>
    </div>
  );
}
