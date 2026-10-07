"use client";

import { useMemo, useState } from "react";

/*
  Pick several colleges at once. Narrow the list by type (the stream) and by a search
  on name or city, tick the ones you want, and the ticks are kept while you change the
  filter, so colleges of different types can go into one row.
*/

export type PickableCollege = { slug: string; name: string; stream: string; city: string };

export function CollegeMultiPicker({
  colleges,
  streams,
  selected,
  onChange,
  max,
  idPrefix,
  hideType,
}: {
  colleges: PickableCollege[];
  /** The types offered in the filter. */
  streams: string[];
  /** Picked college slugs, in the order they were picked. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** At most this many can be picked. */
  max?: number;
  idPrefix: string;
  /** The list is already of one type, so the Type filter is left out. */
  hideType?: boolean;
}) {
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      colleges.filter(
        (c) => (!type || c.stream === type) && (!q || `${c.name} ${c.city}`.toLowerCase().includes(q))
      ),
    [colleges, type, q]
  );

  const chosen = new Set(selected);
  const atLimit = max !== undefined && selected.length >= max;
  const toggle = (slug: string) =>
    onChange(chosen.has(slug) ? selected.filter((s) => s !== slug) : atLimit ? selected : [...selected, slug]);

  const room = max === undefined ? Infinity : max - selected.length;
  const selectShown = () => {
    const add = shown.filter((c) => !chosen.has(c.slug)).slice(0, room).map((c) => c.slug);
    if (add.length > 0) onChange([...selected, ...add]);
  };

  const input =
    "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        {!hideType && (
        <div className="min-w-44">
          <label htmlFor={`${idPrefix}-type`} className="block text-xs font-semibold text-ink">
            Type
          </label>
          <select id={`${idPrefix}-type`} value={type} onChange={(e) => setType(e.target.value)} className={`${input} mt-1.5`}>
            <option value="">All types</option>
            {streams.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        )}
        <div className="min-w-56 flex-1">
          <label htmlFor={`${idPrefix}-search`} className="block text-xs font-semibold text-ink">
            Search
          </label>
          <input
            id={`${idPrefix}-search`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="College name or city"
            className={`${input} mt-1.5`}
          />
        </div>
        <button
          type="button"
          onClick={selectShown}
          disabled={shown.length === 0 || atLimit}
          className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40"
        >
          Select all shown
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="px-1 py-2 text-sm text-ink-soft underline-offset-4 hover:text-red-700 hover:underline">
            Clear
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-ink-soft" aria-live="polite">
        {selected.length} picked{max !== undefined ? ` of ${max}` : ""} · {shown.length} shown
      </p>

      <ul className="mt-2 grid max-h-80 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-line bg-bg-alt p-2 md:grid-cols-2">
        {shown.map((c) => {
          const on = chosen.has(c.slug);
          return (
            <li key={c.slug}>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg ${!on && atLimit ? "cursor-not-allowed opacity-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && atLimit}
                  onChange={() => toggle(c.slug)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                <span className="shrink-0 text-xs text-ink-faint">
                  {c.city} · {c.stream}
                </span>
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-2 py-3 text-sm text-ink-soft">No college matches this filter.</li>}
      </ul>
    </div>
  );
}
