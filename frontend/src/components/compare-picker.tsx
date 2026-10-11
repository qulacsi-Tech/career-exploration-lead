"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { MAX_COMPARE } from "@/lib/comparison-data";
import type { CompareEntry } from "@/components/compare-tray";

/*
  The "Add colleges" dialog on the compare tray.

  It opens on the whole directory, so there is something to pick before anything is typed;
  typing searches it (by name or city, on the server, so every college is reachable and not
  only the first page). Tick up to three colleges, and Compare opens the comparison page.

  What is ticked is kept while the search changes, and the colleges already in the tray start
  ticked. Nothing reaches the tray until Compare is pressed, so Cancel leaves it as it was.
*/

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const PAGE_SIZE = 30;

type Row = { slug: string; name: string; city: string; state: string; stream: string };
type Page = { rows: Row[]; page: number; pages: number };

async function load(query: string, page: number, signal: AbortSignal): Promise<Page> {
  const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: "name" });
  if (query) qs.set("q", query);
  const res = await fetch(`${API_BASE}/colleges?${qs}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const json = (await res.json()) as { data: Row[]; meta: { page: number; pages: number } };
  return { rows: json.data, page: json.meta.page, pages: json.meta.pages };
}

export function ComparePicker({
  initial,
  onApply,
  onClose,
}: {
  /** The colleges already in the tray. They start ticked. */
  initial: CompareEntry[];
  /** Compare was pressed with 2 or 3 colleges ticked. */
  onApply: (picked: CompareEntry[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<CompareEntry[]>(initial);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState({ page: 0, pages: 1 });
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [more, setMore] = useState(false);
  const aborter = useRef<AbortController | null>(null);

  // A fresh search starts from page one. Typing waits a moment so every key does not ask the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      aborter.current?.abort();
      const controller = new AbortController();
      aborter.current = controller;
      setStatus("loading");
      load(query.trim(), 1, controller.signal)
        .then((result) => {
          setRows(result.rows);
          setPage({ page: result.page, pages: result.pages });
          setStatus("ready");
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setStatus("failed");
        });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => aborter.current?.abort(), []);

  const showMore = useCallback(() => {
    setMore(true);
    const controller = new AbortController();
    load(query.trim(), page.page + 1, controller.signal)
      .then((result) => {
        setRows((current) => [...current, ...result.rows.filter((r) => !current.some((c) => c.slug === r.slug))]);
        setPage({ page: result.page, pages: result.pages });
      })
      .catch(() => setStatus("failed"))
      .finally(() => setMore(false));
  }, [query, page.page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const isPicked = (slug: string) => picked.some((p) => p.slug === slug);
  const full = picked.length >= MAX_COMPARE;
  const toggle = (row: Row) =>
    setPicked((current) =>
      current.some((p) => p.slug === row.slug)
        ? current.filter((p) => p.slug !== row.slug)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, { slug: row.slug, name: row.name }]
    );

  const ready = picked.length >= 2;
  const submit = () => {
    if (!ready) return;
    onApply(picked);
  };

  // Drawn on <body>, not where it is written: the compare bar has a blur behind it, and a blurred
  // parent makes a `fixed` child position itself against the bar instead of the screen.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[5vh]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-picker-title"
        className="relative flex max-h-[min(78vh,38rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="compare-picker-title" className="font-display text-xl font-semibold text-ink">
              Choose colleges to compare
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Pick 2 or 3. Search by name or city, or browse the list.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-6 pt-4">
          <div className="relative">
            <label htmlFor="compare-search" className="sr-only">Search colleges</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              id="compare-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by college name or city"
              autoComplete="off"
              className="w-full rounded-full border border-line bg-bg py-2.5 pl-10 pr-4 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>

          {picked.length > 0 && (
            <ul className="flex max-h-[4.5rem] flex-wrap gap-2 overflow-y-auto" aria-label="Selected colleges">
              {picked.map((p) => (
                <li key={p.slug} className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft py-1 pl-3 pr-1.5 text-xs text-brand-ink">
                  <span className="max-w-48 truncate">{p.name}</span>
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPicked((c) => c.filter((x) => x.slug !== p.slug))} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="mt-3 min-h-[7rem] flex-1 divide-y divide-line overflow-y-auto border-t border-line" aria-busy={status === "loading"}>
          {rows.map((row) => {
            const on = isPicked(row.slug);
            const disabled = !on && full;
            return (
              <li key={row.slug}>
                <label className={`flex items-center gap-3 px-6 py-3 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-bg-alt"}`}>
                  <input type="checkbox" checked={on} disabled={disabled} onChange={() => toggle(row)} className="h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {[row.city, row.state].filter(Boolean).join(", ")}
                      {row.stream ? ` · ${row.stream}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
          {status === "loading" && (
            <li className="flex items-center justify-center gap-2 px-6 py-6 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading colleges…
            </li>
          )}
          {status === "failed" && <li className="px-6 py-6 text-center text-sm text-red-700">Could not load the colleges. Check your connection and try again.</li>}
          {status === "ready" && rows.length === 0 && <li className="px-6 py-6 text-center text-sm text-ink-soft">No college matches &ldquo;{query}&rdquo;.</li>}
          {status === "ready" && page.page < page.pages && (
            <li className="px-6 py-3 text-center">
              <button type="button" onClick={showMore} disabled={more} className="rounded-full border border-line px-5 py-2 text-sm text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-60">
                {more ? "Loading…" : "Show more colleges"}
              </button>
            </li>
          )}
        </ul>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-6 py-3">
          <p className="text-sm text-ink-soft" aria-live="polite">
            {picked.length} of {MAX_COMPARE} selected{picked.length === 1 ? ". Pick one more." : ""}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2 text-sm text-ink-soft transition hover:border-brand">Cancel</button>
            <button type="button" onClick={submit} disabled={!ready} className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              {ready ? `Compare ${picked.length}` : "Compare"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
