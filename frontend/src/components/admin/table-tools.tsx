"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";

/*
  Search, filters and sortable column headings for an admin table, in one hook.

    const t = useTableTools({ rows, search, sorts, filters });
    t.toolbar        the search box, the filter dropdowns and a "clear" button
    t.th("key", "Label")   a column heading that sorts when clicked (ascending, descending, then back to as-is)
    t.rows           the rows to draw: filtered, then sorted

  It works on the rows the page was given, so for a table that is paged on the server it covers the page in view;
  `note` says so under the toolbar when there are more pages.
*/

export type TableFilter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

type Sort = { key: string; dir: "asc" | "desc" } | null;

const compare = (a: string | number | null, b: string | number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nothing sorts last, in either direction
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

/** The distinct values of a column as filter options, labelled, in alphabetical order. */
export function optionsOf<T>(rows: T[], value: (row: T) => string | null | undefined, label: (v: string) => string = (v) => v) {
  return [...new Set(rows.map(value).filter((v): v is string => !!v))].sort((a, b) => label(a).localeCompare(label(b))).map((v) => ({ value: v, label: label(v) }));
}

export function useTableTools<T>({
  rows,
  search,
  sorts,
  filters = [],
  initialSort = null,
  initialFilters,
  placeholder = "Search",
  note,
}: {
  rows: T[];
  /** The text a row is searched by. */
  search: (row: T) => string;
  /** How each sortable column orders its rows. */
  sorts: Record<string, (row: T) => string | number | null>;
  filters?: TableFilter<T>[];
  initialSort?: Sort;
  /** Filters already chosen when the table first shows, e.g. coming from a notification. */
  initialFilters?: Record<string, string>;
  placeholder?: string;
  /** Shown under the toolbar, e.g. that only this page is covered. */
  note?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(initialSort);
  const [chosen, setChosen] = useState<Record<string, string>>(initialFilters ?? {});

  const view = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let out = rows.filter((row) => {
      const text = search(row).toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
      return filters.every((f) => !chosen[f.key] || f.match(row, chosen[f.key]));
    });
    if (sort && sorts[sort.key]) {
      const by = sorts[sort.key];
      const sign = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = by(a);
        const y = by(b);
        // Missing values stay last whichever way it is sorted.
        if (x === null || y === null) return compare(x, y);
        return sign * compare(x, y);
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort, chosen]);

  const active = query.trim() !== "" || Object.values(chosen).some(Boolean);

  const toolbar: ReactNode = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">{placeholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-56 rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </label>
        {filters.map((f) => (
          <label key={f.key} className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <span className="sr-only">{f.label}</span>
            <select
              value={chosen[f.key] ?? ""}
              onChange={(e) => setChosen((c) => ({ ...c, [f.key]: e.target.value }))}
              className={`max-w-[14rem] rounded-lg border bg-surface px-2.5 py-2 text-sm focus:border-brand focus:outline-none ${chosen[f.key] ? "border-brand text-brand-ink" : "border-line text-ink-soft"}`}
            >
              <option value="">{f.label}: all</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        ))}
        {(active || sort) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setChosen({});
              setSort(initialSort);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-ink-faint">
          {active ? `${view.length} of ${rows.length}` : `${rows.length}`} shown
        </span>
      </div>
      {note && <p className="text-xs text-ink-faint">{note}</p>}
    </div>
  );

  const th = (key: string, label: string, className = "px-3 py-2.5") => {
    const on = sort?.key === key;
    const Icon = !on ? ArrowUpDown : sort?.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={on ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
        <button
          type="button"
          onClick={() => setSort(!on ? { key, dir: "asc" } : sort?.dir === "asc" ? { key, dir: "desc" } : null)}
          className={`group inline-flex items-center gap-1 font-semibold uppercase tracking-wide ${on ? "text-brand-ink" : "text-ink-soft hover:text-ink"}`}
        >
          {label}
          <Icon className={`h-3 w-3 ${on ? "text-brand" : "text-ink-faint group-hover:text-ink-soft"}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return { rows: view, toolbar, th, active };
}
