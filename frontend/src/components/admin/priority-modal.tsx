"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { loadDefaultPriorities, loadLinkInstitutes, loadPriorityScopes, loadScopeInstitutes, saveDefaultPriorities, saveMenuPriorities, saveScopePriorities } from "@/lib/admin-actions";
import type { PriorityScopeGroup } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { PriorityAssigner } from "@/components/admin/priority-assigner";

/** One header-menu link the priorities can be set for, with what is already saved on it. */
export type PriorityLink = { groupId: string; groupLabel: string; key: string; label: string; href: string; priority: Record<string, number> };

type Row = { slug: string; name: string; city: string; rank: number | null; value: string };

const DEFAULT = "default";
/** A scope that starts with this is one of the filters of the college listing (`f:city=Pune`), not a header-menu link. */
const FILTER = "f:";
const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const ghostButton = "rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand";

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
  const [saving, startSave] = useTransition();

  // Every filter on the left of the college listing, each with its values: a priority can be set for any of them.
  const [filters, setFilters] = useState<PriorityScopeGroup[]>([]);
  useEffect(() => {
    let current = true;
    loadPriorityScopes().then((found) => current && Array.isArray(found) && setFilters(found));
    return () => {
      current = false;
    };
  }, []);
  const isFilter = scope.startsWith(FILTER);
  const filterLabel = useMemo(() => {
    for (const g of filters) for (const o of g.options) if (`${FILTER}${o.scope}` === scope) return `${g.label}: ${o.label}`;
    return "";
  }, [filters, scope]);

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
    } else if (isFilter) {
      loadScopeInstitutes(scope.slice(FILTER.length)).then((result) => {
        if ("error" in result) return current && setError(result.error);
        done(result.colleges.map((c) => ({ slug: c.slug, name: c.name, city: c.city, rank: c.rank, value: c.priority ? String(c.priority) : "" })), result.truncated);
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

  const save = () => {
    if (!rows) return;
    setError("");
    startSave(async () => {
      const result =
        scope === DEFAULT
          ? await saveDefaultPriorities(Object.fromEntries(rows.map((r) => [r.slug, r.value ? Number(r.value) : null])))
          : isFilter
            ? await saveScopePriorities(scope.slice(FILTER.length), Object.fromEntries(rows.filter((r) => r.value).map((r) => [r.slug, Number(r.value)])))
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
      description="A priority is a place in the list: 1 is the first place, 2 the second. Several institutes can share a number: on every visit one of them takes that place and the others follow right after. A priority never goes below the places that exist, so 9 is ninth only if eight others fill the places before it. Institutes with no number fill the rest by NIRF rank."
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>Cancel</button>
          <button type="button" onClick={save} disabled={!rows || saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {saving ? "Saving…" : "Save priorities"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4">
          <div>
            <label htmlFor="priority-scope" className="block text-xs font-semibold text-ink">Set the priority for</label>
            <select id="priority-scope" value={scope} onChange={(e) => setScope(e.target.value)} className={`mt-1.5 ${input}`}>
              <option value={DEFAULT}>Default order (every list without its own priority)</option>
              {filters.map((g) => (
                <optgroup key={`filter-${g.id}`} label={`Filter · ${g.label}`}>
                  {g.options.map((o) => (
                    <option key={o.scope} value={`${FILTER}${o.scope}`}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.links.map((l) => (
                    <option key={`${l.groupId}:${l.key}`} value={`${l.groupId}:${l.key}`}>{l.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <p className="rounded-lg bg-bg-alt/70 px-4 py-2.5 text-xs text-ink-soft">
          {scope === DEFAULT
            ? "The default priority of a college applies in every list that has no priority of its own."
            : isFilter
              ? `These apply when a visitor filters the college list by “${filterLabel}”. They come before the default priority, and a more specific filter (course, specialisation, ranking) wins over a broader one.`
              : `These apply when a visitor opens “${link?.label ?? ""}” from the header menu, and come before the default priority.`}
        </p>

        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        {!rows && !error ? (
          <p className="text-sm text-ink-soft">Loading the institutes…</p>
        ) : rows && rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No published institute is under this link right now.</p>
        ) : rows ? (
          <PriorityAssigner rows={rows} setRows={setRows} showRank={scope === DEFAULT || isFilter} truncated={truncated} />
        ) : null}
      </div>
    </AdminModal>
  );
}
