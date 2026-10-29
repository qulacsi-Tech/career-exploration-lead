"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

/**
 * Find anything on a college page. A small search button sits at the bottom right of the screen; it opens a
 * box, and as you type every match on the page is highlighted (the one you are on in a stronger colour), with
 * "3 of 12", Next and Previous (or Enter and Shift+Enter), and the page scrolls to it. "/" opens it from the
 * keyboard, Escape closes it and clears the highlights.
 *
 * The highlighting uses the browser's CSS Custom Highlight API: it paints over the text where it is, without
 * wrapping it in new elements, so the page's own components (tabs, filters, accordions) are left alone and keep
 * working. A browser without it simply does not get the button.
 */

type HighlightCtor = new (...ranges: Range[]) => unknown;
type HighlightRegistry = { set: (name: string, value: unknown) => void; delete: (name: string) => void };

const supported = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof (window as unknown as { Highlight?: HighlightCtor }).Highlight === "function";
const registry = () => (CSS as unknown as { highlights: HighlightRegistry }).highlights;

/** Every range in `root` whose text matches `query`, in reading order. The search box itself is skipped. */
function findRanges(root: HTMLElement, query: string): Range[] {
  const needle = query.toLowerCase();
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el || el.closest("[data-no-search], script, style, noscript, [hidden]")) return NodeFilter.FILTER_REJECT;
      // Text inside something collapsed or invisible cannot be shown, so it is not a match.
      return el.getClientRects().length === 0 ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").toLowerCase();
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      ranges.push(range);
    }
  }
  return ranges;
}

export function PageSearch({ targetId }: { targetId: string }) {
  const [ok, setOk] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const ranges = useRef<Range[]>([]);

  useEffect(() => setOk(supported()), []);

  const clear = useCallback(() => {
    if (!supported()) return;
    registry().delete("page-search");
    registry().delete("page-search-current");
    ranges.current = [];
  }, []);

  // Highlights `current` strongly and the rest softly, and brings the current one into view.
  const paint = useCallback((current: number, scroll: boolean) => {
    const all = ranges.current;
    const Highlight = (window as unknown as { Highlight: HighlightCtor }).Highlight;
    registry().set("page-search", new Highlight(...all));
    if (all[current]) {
      registry().set("page-search-current", new Highlight(all[current]));
      if (scroll) all[current].startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      registry().delete("page-search-current");
    }
  }, []);

  const search = useCallback(
    (q: string, keepIndex = false) => {
      const root = document.getElementById(targetId);
      const term = q.trim();
      if (!root || term.length < 2) {
        clear();
        setCount(0);
        setIndex(0);
        return;
      }
      ranges.current = findRanges(root, term);
      setCount(ranges.current.length);
      const next = keepIndex ? Math.min(index, Math.max(0, ranges.current.length - 1)) : 0;
      setIndex(next);
      paint(next, !keepIndex);
    },
    [targetId, clear, paint, index],
  );

  // Typing searches after a short pause.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(query), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // The page changes under a search (a course filter, a tab inside a card): find again, staying where we were.
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const root = document.getElementById(targetId);
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => search(query, true), 200);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, targetId]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCount(0);
    clear();
  }, [clear]);

  // "/" opens the box, unless the visitor is typing somewhere.
  useEffect(() => {
    if (!ok) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "/" && !open && !el?.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ok, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => clear, [clear]);

  const step = (by: 1 | -1) => {
    if (count === 0) return;
    const next = (index + by + count) % count;
    setIndex(next);
    paint(next, true);
  };

  if (!ok) return null;

  if (!open) {
    return (
      <button
        type="button"
        data-no-search
        onClick={() => setOpen(true)}
        aria-label="Search this page"
        title="Search this page (press /)"
        className="fixed bottom-24 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-dark"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div data-no-search role="search" className="fixed bottom-24 right-5 z-30 flex w-[min(24rem,calc(100vw-2.5rem))] items-center gap-1.5 rounded-2xl border border-line bg-surface p-2 shadow-xl">
      <Search className="ml-2 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          else if (e.key === "Enter") {
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
          }
        }}
        placeholder="Find on this page"
        aria-label="Find on this page"
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <span aria-live="polite" className="shrink-0 px-1 text-xs tabular-nums text-ink-soft">
        {query.trim().length < 2 ? "" : count === 0 ? "No match" : `${index + 1} of ${count}`}
      </span>
      <button type="button" onClick={() => step(-1)} disabled={count === 0} aria-label="Previous match" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition hover:bg-bg-alt disabled:opacity-30">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => step(1)} disabled={count === 0} aria-label="Next match" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition hover:bg-bg-alt disabled:opacity-30">
        <ChevronDown className="h-4 w-4" />
      </button>
      <button type="button" onClick={close} aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition hover:bg-bg-alt">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
