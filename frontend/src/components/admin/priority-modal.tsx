"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { loadDefaultPriorities, loadLinkInstitutes, saveDefaultPriorities, saveMenuPriorities } from "@/lib/admin-actions";
import { AdminModal } from "@/components/admin/admin-modal";

/** One header-menu link the priorities can be set for, with what is already saved on it. */
export type PriorityLink = { groupId: string; groupLabel: string; key: string; label: string; href: string; priority: Record<string, number> };

type Row = { slug: string; name: string; city: string; rank: number | null; value: string };

const DEFAULT = "default";
const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const ghostButton = "rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand";

const whole = (value: string) => /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 100000;

/**
 * A button for the colleges page that opens the priority dialog: which institutes come first, in the
 * default order every list falls back on and, per header-menu link, in that link's own list.
 */
export function PriorityButton({ links }: { links: PriorityLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand">
        <ListOrdered className="h-4 w-4" aria-hidden="true" />
        Advanced priority
      </button>
      {open && <PriorityDialog links={links} onClose={() => setOpen(false)} />}
    </>
  );
}

function PriorityDialog({ links, onClose }: { links: PriorityLink[]; onClose: () => void }) {
  const router = useRouter();
  const [scope, setScope] = useState(DEFAULT);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, startSave] = useTransition();

  const link = links.find((l) => `${l.groupId}:${l.key}` === scope);
  const groups = useMemo(() => {
    const byGroup = new Map<string, { label: string; links: PriorityLink[] }>();
    for (const l of links) {
      const g = byGroup.get(l.groupId) ?? { label: l.groupLabel, links: [] };
      g.links.push(l);
      byGroup.set(l.groupId, g);
    }
    return [...byGroup.values()];
  }, [links]);

  // The institutes of the chosen list, with the priorities already saved, those with a number first.
  useEffect(() => {
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(null);
    setError("");
    setQuery("");
    const done = (list: Row[], cut = false) => {
      if (!current) return;
      const numbered = list.filter((r) => r.value).sort((a, b) => Number(a.value) - Number(b.value));
      setRows([...numbered, ...list.filter((r) => !r.value)]);
      setTruncated(cut);
    };
    if (scope === DEFAULT) {
      loadDefaultPriorities().then((result) => {
        if ("error" in result) return current && setError(result.error);
        done(result.colleges.map((c) => ({ slug: c.slug, name: c.name, city: c.city, rank: c.rank, value: c.priority ? String(c.priority) : "" })));
      });
    } else if (link) {
      loadLinkInstitutes(link.href).then((result) => {
        if ("error" in result) return current && setError(result.error);
        done(result.colleges.map((c) => ({ slug: c.slug, name: c.name, city: c.city, rank: null, value: link.priority[c.slug] ? String(link.priority[c.slug]) : "" })), result.truncated);
      });
    }
    return () => {
      current = false;
    };
    // `link` follows `scope`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const setValue = (slug: string, value: string) => setRows((prev) => prev?.map((r) => (r.slug === slug ? { ...r, value: value.replace(/\D/g, "") } : r)) ?? prev);

  // Each number belongs to one institute.
  const problem = useMemo(() => {
    if (!rows) return "";
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (!r.value) continue;
      if (!whole(r.value)) return `${r.name}: a priority is a whole number from 1 to 100000.`;
      const other = seen.get(r.value);
      if (other) return `Priority ${r.value} is given to both ${other} and ${r.name}. Each number belongs to one institute.`;
      seen.set(r.value, r.name);
    }
    return "";
  }, [rows]);
  const clashing = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) if (r.value) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
    return new Set([...counts].filter(([, n]) => n > 1).map(([v]) => v));
  }, [rows]);

  const q = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !q || `${r.name} ${r.city}`.toLowerCase().includes(q));
  const numbered = (rows ?? []).filter((r) => r.value).length;

  const numberInOrder = () => setRows((prev) => prev?.map((r, i) => ({ ...r, value: String(i + 1) })) ?? prev);
  const clearAll = () => setRows((prev) => prev?.map((r) => ({ ...r, value: "" })) ?? prev);

  const save = () => {
    if (!rows || problem) return;
    setError("");
    startSave(async () => {
      const result =
        scope === DEFAULT
          ? await saveDefaultPriorities(Object.fromEntries(rows.map((r) => [r.slug, r.value ? Number(r.value) : null])))
          : await saveMenuPriorities(scope, Object.fromEntries(rows.filter((r) => r.value).map((r) => [r.slug, Number(r.value)])));
      if ("error" in result) return setError(result.error);
      router.refresh();
      onClose();
    });
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      size="eighty"
      title="Advanced priority"
      description="Choose which institutes come first. Priority 1 is shown first, then 2, and so on. Institutes with no number follow, in the default order and then by NIRF rank."
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>Cancel</button>
          <button type="button" onClick={save} disabled={!rows || saving || Boolean(problem)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {saving ? "Saving…" : "Save priorities"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label htmlFor="priority-scope" className="block text-xs font-semibold text-ink">Set the priority for</label>
            <select id="priority-scope" value={scope} onChange={(e) => setScope(e.target.value)} className={`mt-1.5 ${input}`}>
              <option value={DEFAULT}>Default order (every list without its own priority)</option>
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.links.map((l) => (
                    <option key={`${l.groupId}:${l.key}`} value={`${l.groupId}:${l.key}`}>{l.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority-search" className="block text-xs font-semibold text-ink">Find an institute</label>
            <input id="priority-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or city" className={`mt-1.5 ${input}`} />
          </div>
        </div>

        <p className="rounded-lg bg-bg-alt/70 px-4 py-2.5 text-xs text-ink-soft">
          {scope === DEFAULT
            ? "The default priority of a college applies in every list that has no priority of its own."
            : `These apply when a visitor opens “${link?.label ?? ""}” from the header menu, and come before the default priority.`}
        </p>

        {(problem || error) && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{problem || error}</p>}

        {!rows && !error ? (
          <p className="text-sm text-ink-soft">Loading the institutes…</p>
        ) : rows && rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No published institute is under this link right now.</p>
        ) : rows ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{numbered} of {rows.length} have a priority{truncated ? " (first 500 listed)" : ""}</p>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button type="button" onClick={numberInOrder} className="text-brand hover:underline">Number in the order shown</button>
                <button type="button" onClick={clearAll} className="text-ink-soft hover:underline">Clear all</button>
              </div>
            </div>
            <div className="max-h-[26rem] overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-ink-faint">
                  <tr className="border-b border-line">
                    <th scope="col" className="px-3 py-2 font-semibold">Institute</th>
                    <th scope="col" className="px-3 py-2 font-semibold">City</th>
                    {scope === DEFAULT && <th scope="col" className="px-3 py-2 font-semibold">NIRF</th>}
                    <th scope="col" className="w-32 px-3 py-2 font-semibold">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.slug} className="border-b border-line-soft last:border-b-0">
                      <td className="px-3 py-2 text-ink">{r.name}</td>
                      <td className="px-3 py-2 text-ink-soft">{r.city}</td>
                      {scope === DEFAULT && <td className="px-3 py-2 tabular-nums text-ink-soft">{r.rank ?? "—"}</td>}
                      <td className="px-3 py-1.5">
                        <input
                          inputMode="numeric"
                          aria-label={`Priority of ${r.name}`}
                          value={r.value}
                          placeholder="—"
                          onChange={(e) => setValue(r.slug, e.target.value)}
                          className={`w-24 rounded-lg border bg-bg px-2.5 py-1.5 text-sm tabular-nums text-ink focus:outline-none ${clashing.has(r.value) || (r.value && !whole(r.value)) ? "border-red-400 focus:border-red-600" : "border-line focus:border-brand"}`}
                        />
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-ink-soft">No institute matches “{query}”.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AdminModal>
  );
}
