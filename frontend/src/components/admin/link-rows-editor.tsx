"use client";

import type { LinkPool } from "@/lib/api";

/*
  A list of links (a label and a site path), chosen from the pages that already exist.

  Each row has a picker grouped as Pages, Categories, Exams, Courses, Programmes, Cities,
  College lists and Colleges, built from the directory itself. Choosing one fills in the path
  and, when the label is empty, the label. "A path I type" is there for anything else. The
  server only accepts paths on this site (starting with /).
*/

export type LinkDraft = { label: string; href: string };

const CUSTOM = "__custom__";

export function LinkRowsEditor({
  links,
  onChange,
  pool,
  max,
  idPrefix,
}: {
  links: LinkDraft[];
  onChange: (links: LinkDraft[]) => void;
  pool: LinkPool;
  max: number;
  idPrefix: string;
}) {
  const known = new Map(pool.groups.flatMap((g) => g.items.map((i) => [i.path, i.label] as const)));
  const set = (i: number, patch: Partial<LinkDraft>) => onChange(links.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const choose = (i: number, value: string) => {
    if (value === CUSTOM) return set(i, { href: "/" });
    const link = links[i];
    // The label follows the pick while it is empty or still the previous pick's name.
    const follows = link.label.trim() === "" || link.label === known.get(link.href);
    set(i, { href: value, ...(follows ? { label: known.get(value) ?? link.label } : {}) });
  };

  const move = (i: number, direction: -1 | 1) => {
    const to = i + direction;
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  const field = "w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

  return (
    <fieldset>
      <legend className="text-xs font-semibold text-ink">
        Links <span className="font-normal text-ink-soft">({links.length} of {max})</span>
      </legend>
      <ul className="mt-2 space-y-2">
        {links.map((link, i) => {
          const isKnown = known.has(link.href);
          return (
            <li key={i} className="grid grid-cols-1 items-start gap-2 rounded-lg border border-line-soft bg-bg-alt/50 p-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-1.5">
                <label className="sr-only" htmlFor={`${idPrefix}-pick-${i}`}>Page for link {i + 1}</label>
                <select id={`${idPrefix}-pick-${i}`} value={isKnown ? link.href : CUSTOM} onChange={(e) => choose(i, e.target.value)} className={field}>
                  <option value={CUSTOM}>A path I type…</option>
                  {pool.groups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map((item) => (
                        <option key={item.path} value={item.path}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {!isKnown && (
                  <>
                    <label className="sr-only" htmlFor={`${idPrefix}-path-${i}`}>Path for link {i + 1}</label>
                    <input id={`${idPrefix}-path-${i}`} value={link.href} onChange={(e) => set(i, { href: e.target.value })} placeholder="/colleges" className={field} />
                  </>
                )}
              </div>
              <div className="min-w-0">
                <label className="sr-only" htmlFor={`${idPrefix}-label-${i}`}>Label for link {i + 1}</label>
                <input id={`${idPrefix}-label-${i}`} value={link.label} maxLength={120} onChange={(e) => set(i, { label: e.target.value })} placeholder="Link text" className={field} />
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label={`Move link ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
                <button type="button" aria-label={`Move link ${i + 1} down`} disabled={i === links.length - 1} onClick={() => move(i, 1)} className="rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
                <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(links.filter((_, n) => n !== i))} className="rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" disabled={links.length >= max} onClick={() => onChange([...links, { label: "", href: "/colleges" }])} className="mt-2 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
        Add a link
      </button>
    </fieldset>
  );
}

/** A single page picker (for "View all"): the pool, or a typed path. */
export function PagePicker({
  id,
  label,
  value,
  onChange,
  pool,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (path: string) => void;
  pool: LinkPool;
  hint?: string;
}) {
  const known = new Set(pool.groups.flatMap((g) => g.items.map((i) => i.path)));
  const isKnown = known.has(value);
  const field = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>
      <select id={id} value={isKnown ? value : CUSTOM} onChange={(e) => onChange(e.target.value === CUSTOM ? "/" : e.target.value)} className={field}>
        <option value={CUSTOM}>A path I type…</option>
        {pool.groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((item) => (
              <option key={item.path} value={item.path}>{item.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {!isKnown && <input aria-label={`${label} path`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/colleges" className={field} />}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
