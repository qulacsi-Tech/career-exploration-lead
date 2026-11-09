"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useTableTools } from "@/components/admin/table-tools";

export type PriorityRow = { slug: string; name: string; city: string; rank: number | null; value: string };

const selectCls = "rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/**
 * Setting priorities without typing a number against every institute:
 *
 *   1. Choose a priority (a place in the list: 1 is the first, 2 the second…).
 *   2. Open the list of institutes, search it and tick the ones that should hold that place. Several can.
 *   3. They appear in the table below, which can be sorted and searched; a place can be changed from its dropdown.
 *
 * It edits `rows` (each institute's `value` is its priority, or empty); the dialog saves them.
 */
export function PriorityAssigner({
  rows,
  setRows,
  showRank,
  truncated,
}: {
  rows: PriorityRow[];
  setRows: Dispatch<SetStateAction<PriorityRow[] | null>>;
  showRank: boolean;
  truncated: boolean;
}) {
  const [place, setPlace] = useState("1");
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const box = useRef<HTMLDivElement>(null);

  // The places on offer: one past the list is as far as a place can usefully go.
  const places = useMemo(() => {
    const top = Math.max(10, rows.length + 1);
    return Array.from({ length: Math.min(top, 100) }, (_, i) => String(i + 1));
  }, [rows.length]);

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const set = (slug: string, value: string) => setRows((prev) => prev?.map((r) => (r.slug === slug ? { ...r, value } : r)) ?? prev);
  const toggle = (r: PriorityRow) => set(r.slug, r.value === place ? "" : place);

  const needle = find.trim().toLowerCase();
  const pickable = rows.filter((r) => !needle || `${r.name} ${r.city}`.toLowerCase().includes(needle));
  const here = rows.filter((r) => r.value === place).length;

  const assigned = useMemo(() => rows.filter((r) => r.value), [rows]);
  const table = useTableTools<PriorityRow>({
    rows: assigned,
    search: (r) => `${r.name} ${r.city}`,
    placeholder: "Search the assigned institutes",
    initialSort: { key: "priority", dir: "asc" },
    sorts: {
      priority: (r) => Number(r.value),
      institute: (r) => r.name,
      city: (r) => r.city,
      rank: (r) => r.rank,
    },
  });
  const sharing = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of assigned) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
    return counts;
  }, [assigned]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-bg-alt/50 p-4">
        <p className="text-sm font-semibold text-ink">Assign a priority</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)] md:items-end">
          <div>
            <label htmlFor="assign-place" className="block text-xs font-semibold text-ink">Priority</label>
            <select id="assign-place" value={place} onChange={(e) => setPlace(e.target.value)} className={`mt-1.5 w-full ${selectCls}`}>
              {places.map((p) => (
                <option key={p} value={p}>
                  {p}
                  {sharing.get(p) ? ` (${sharing.get(p)} assigned)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div ref={box} className="relative">
            <span className="block text-xs font-semibold text-ink">Institutes for priority {place}</span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={`mt-1.5 flex w-full items-center justify-between gap-2 ${selectCls} text-left`}
            >
              <span className="truncate">{here === 0 ? "Choose institutes…" : `${here} chosen for priority ${place}`}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {open && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-line bg-surface shadow-xl">
                <label className="relative block border-b border-line p-2">
                  <span className="sr-only">Search institutes</span>
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                  <input
                    value={find}
                    onChange={(e) => setFind(e.target.value)}
                    placeholder="Search by name or city"
                    autoFocus
                    className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
                  />
                </label>
                <ul role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto py-1">
                  {pickable.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">No institute matches.</li>}
                  {pickable.map((r) => {
                    const on = r.value === place;
                    return (
                      <li key={r.slug} role="option" aria-selected={on}>
                        <button type="button" onClick={() => toggle(r)} className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-bg-alt ${on ? "bg-brand-soft/50" : ""}`}>
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}>
                            {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ink">{r.name}</span>
                            <span className="block truncate text-xs text-ink-faint">{r.city}</span>
                          </span>
                          {r.value && !on && <span className="shrink-0 rounded-full bg-bg-alt px-2 py-0.5 text-xs font-semibold text-ink-soft">Priority {r.value}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-faint">
                  <span>Tick to give the institute priority {place}; tick again to take it off.</span>
                  <button type="button" onClick={() => setOpen(false)} className="font-semibold text-brand hover:underline">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-faint">Several institutes can hold the same priority: on every visit one of them takes that place and the rest follow right after.</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">
            {assigned.length} of {rows.length} have a priority{truncated ? " (first 500 listed)" : ""}
          </p>
          {assigned.length > 0 && (
            <button type="button" onClick={() => setRows((prev) => prev?.map((r) => ({ ...r, value: "" })) ?? prev)} className="text-xs font-semibold text-ink-soft hover:text-red-700 hover:underline">
              Clear all
            </button>
          )}
        </div>

        {assigned.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No priority is set here yet. Choose a priority above, then tick the institutes that should hold it.</p>
        ) : (
          <>
            {table.toolbar}
            <div className="max-h-[22rem] overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-xs">
                  <tr className="border-b border-line">
                    {table.th("priority", "Priority", "w-40 px-3 py-2")}
                    {table.th("institute", "Institute", "px-3 py-2")}
                    {table.th("city", "City", "px-3 py-2")}
                    {showRank && table.th("rank", "NIRF", "px-3 py-2")}
                    <th scope="col" className="w-12 px-3 py-2"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-ink-soft">No assigned institute matches.</td></tr>
                  )}
                  {table.rows.map((r) => (
                    <tr key={r.slug} className="border-b border-line-soft last:border-b-0">
                      <td className="px-3 py-1.5">
                        <select aria-label={`Priority of ${r.name}`} value={r.value} onChange={(e) => set(r.slug, e.target.value)} className={`w-24 ${selectCls} py-1.5`}>
                          {places.includes(r.value) ? null : <option value={r.value}>{r.value}</option>}
                          {places.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        {(sharing.get(r.value) ?? 0) > 1 && <span className="ml-2 text-xs text-ink-faint">shared by {sharing.get(r.value)}</span>}
                      </td>
                      <td className="px-3 py-2 text-ink">{r.name}</td>
                      <td className="px-3 py-2 text-ink-soft">{r.city}</td>
                      {showRank && <td className="px-3 py-2 tabular-nums text-ink-soft">{r.rank ?? "—"}</td>}
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => set(r.slug, "")} aria-label={`Take the priority off ${r.name}`} title="Remove" className="rounded-md p-1 text-ink-faint transition hover:bg-bg-alt hover:text-red-700">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
