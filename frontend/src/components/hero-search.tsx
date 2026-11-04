"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, GraduationCap, Layers, Loader2, MapPin, Search } from "lucide-react";
import { liveSearch } from "@/lib/search-actions";
import type { SearchKind, SearchResults } from "@/lib/api";

type Item = { key: string; kind: "College" | "Course" | "Specialisation" | "Exam" | "City"; title: string; note: string; href: string };

const ICON = { College: GraduationCap, Course: BookOpen, Specialisation: Layers, Exam: ClipboardList, City: MapPin } as const;

/** What the left dropdown narrows the search to. */
const KINDS: { value: "" | SearchKind; label: string; heading: Item["kind"] | "" }[] = [
  { value: "", label: "All", heading: "" },
  { value: "colleges", label: "Colleges", heading: "College" },
  { value: "courses", label: "Courses", heading: "Course" },
  { value: "specialisations", label: "Specialisations", heading: "Specialisation" },
  { value: "exams", label: "Exams", heading: "Exam" },
  { value: "cities", label: "Cities", heading: "City" },
];

/** The matched part of a name drawn bold, so it is clear why a result is there. */
function Match({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-bold text-ink">{text.slice(at, at + query.length)}</strong>
      {text.slice(at + query.length)}
    </>
  );
}

function itemsOf(results: SearchResults | null): Item[] {
  if (!results) return [];
  return [
    ...results.colleges.map((c) => ({ key: `c-${c.slug}`, kind: "College" as const, title: c.name, note: [c.city, c.stream].filter(Boolean).join(" · "), href: `/college/${c.slug}` })),
    ...(results.courses ?? []).map((c) => ({ key: `k-${c.slug}`, kind: "Course" as const, title: c.name, note: c.fullName && c.fullName !== c.name ? c.fullName : (c.stream ?? ""), href: `/courses/${c.slug}` })),
    ...(results.specialisations ?? []).map((sp) => ({ key: `s-${sp.slug}`, kind: "Specialisation" as const, title: sp.name, note: [sp.courseName, sp.stream].filter(Boolean).join(" · "), href: `/colleges?specialisation=${encodeURIComponent(sp.name)}` })),
    ...results.exams.map((e) => ({ key: `e-${e.slug}`, kind: "Exam" as const, title: e.name, note: "Entrance exam", href: `/exams/${e.slug}` })),
    ...results.locations.map((l) => ({ key: `l-${l.slug}`, kind: "City" as const, title: l.name, note: "Colleges in this city", href: `/location/${l.slug}` })),
  ];
}

/**
 * The homepage search box, with the matches listed right under it as the visitor types: colleges, courses, exams
 * and cities, narrowed to the kind chosen in the dropdown. Nothing navigates until they pick one (click, or the arrow keys and
 * Enter); with nothing picked, Enter or the button opens the full results page as before.
 *
 * The list is drawn on the page itself, not inside the hero, because the hero clips whatever runs past its edge.
 */
export function HeroSearch({ placeholder, buttonLabel }: { placeholder: string; buttonLabel: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"" | SearchKind>("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [frame, setFrame] = useState<{ top: number; left: number; width: number } | null>(null);

  const term = query.trim();
  const ready = term.length >= 2;
  const items = itemsOf(results);

  // Look up what was typed, shortly after they pause. An answer that arrives after a newer question is dropped.
  useEffect(() => {
    if (!ready) return;
    const mine = ++sequence.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await liveSearch(term, scope || undefined);
      if (mine !== sequence.current) return;
      setResults(found);
      setActive(-1);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [term, scope, ready]);

  // Keep the list under the box, wherever the page has scrolled to.
  const place = useCallback(() => {
    const box = form.current?.getBoundingClientRect();
    if (box) setFrame({ top: box.bottom + 8, left: box.left, width: box.width });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // A click anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!form.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(items[active].href);
    }
  };

  const showList = open && ready && frame;
  const grouped = (["College", "Course", "Specialisation", "Exam", "City"] as const).map((kind) => [kind, items.filter((i) => i.kind === kind)] as const).filter(([, rows]) => rows.length > 0);

  return (
    <>
      <form
        ref={form}
        action="/search"
        role="search"
        className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-3xl border border-white/20 bg-surface p-2 shadow-lg sm:flex-row sm:items-center sm:gap-0 sm:rounded-full"
      >
        <label htmlFor="hero-kind" className="sr-only">What to search</label>
        <div className="relative shrink-0 sm:border-r sm:border-line">
          <select
            id="hero-kind"
            name="type"
            value={scope}
            onChange={(e) => setScope(e.target.value as "" | SearchKind)}
            className="w-full cursor-pointer appearance-none rounded-full bg-transparent py-2.5 pl-4 pr-9 text-sm font-medium text-ink focus:outline-none sm:w-auto"
          >
            {KINDS.map((k) => (
              <option key={k.value || "all"} value={k.value}>{k.label}</option>
            ))}
          </select>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true">
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="relative flex min-w-0 flex-1 items-center">
          <input
            type="search"
            name="q"
            role="combobox"
            aria-expanded={!!showList}
            aria-controls="hero-search-results"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `hero-result-${active}` : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (e.target.value.trim().length < 2) setResults(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {loading && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-ink-faint" aria-hidden="true" />}
        </div>
        <button type="submit" className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          {buttonLabel}
        </button>
      </form>

      {showList &&
        createPortal(
          <div
            ref={list}
            id="hero-search-results"
            role="listbox"
            style={{ position: "fixed", top: frame.top, left: frame.left, width: frame.width }}
            className="z-[80] max-h-[min(26rem,calc(100vh-9rem))] overflow-y-auto rounded-2xl border border-line bg-surface text-left shadow-2xl"
          >
            {!results && loading && (
              <p className="flex items-center gap-2 px-5 py-4 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…</p>
            )}

            {results && items.length === 0 && (
              <div className="px-5 py-5 text-sm text-ink-soft">
                Nothing matched “{term}”{scope ? ` in ${KINDS.find((k) => k.value === scope)?.label.toLowerCase()}` : ""}. Try a shorter word, or browse the{" "}
                <Link href="/colleges" className="font-semibold text-brand hover:underline">colleges directory</Link>.
              </div>
            )}

            {grouped.map(([kind, rows]) => (
              <div key={kind} className="border-b border-line-soft last:border-b-0">
                <p className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{kind === "City" ? "Cities" : `${kind}s`}</p>
                <ul>
                  {rows.map((item) => {
                    const index = items.indexOf(item);
                    const Icon = ICON[item.kind];
                    return (
                      <li key={item.key} role="presentation">
                        <Link
                          id={`hero-result-${index}`}
                          role="option"
                          aria-selected={index === active}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          onMouseEnter={() => setActive(index)}
                          className={`flex items-center gap-3 px-5 py-2.5 transition ${index === active ? "bg-brand-soft" : "hover:bg-bg-alt"}`}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink-soft"><Match text={item.title} query={term} /></span>
                            {item.note && <span className="block truncate text-xs text-ink-faint">{item.note}</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {results && items.length > 0 && (
              <Link href={`/search?q=${encodeURIComponent(term)}`} onClick={() => setOpen(false)} className="flex items-center gap-2 border-t border-line bg-bg-alt px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand-soft">
                <Search className="h-4 w-4" aria-hidden="true" /> See all results for “{term}”
              </Link>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
