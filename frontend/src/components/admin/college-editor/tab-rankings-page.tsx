"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, X } from "lucide-react";
import { DEFAULT_RANKINGS_PAGE, type CollegeRankingEntry, type RankingsPageConfig, type RankingsSection } from "@/lib/api";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { Card, TextArea, TextInput } from "@/components/admin/college-editor/shared";

const MAX_TOP = 2;

const PARTS: Record<RankingsSection, { name: string; help: string; flag: keyof RankingsPageConfig | null }> = {
  summary: { name: "Top row", help: "The big rank numbers beside the student rating.", flag: null },
  all: { name: "All rankings", help: "A list of every ranking this college is in, with its banner.", flag: "showAll" },
  awards: { name: "Awards", help: "The awards this college has won.", flag: "showAwards" },
  compare: { name: "Comparison", help: "How this college stands against others by rank.", flag: "showCompare" },
};

/** An on/off switch. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${on ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** One part of the page: where it sits, whether it shows, and (opened) the words in it. */
function PartRow({
  index,
  count,
  name,
  help,
  on,
  onToggle,
  onMove,
  children,
}: {
  index: number;
  count: number;
  name: string;
  help: string;
  /** null: the part is always shown. */
  on: boolean | null;
  onToggle: (next: boolean) => void;
  onMove: (by: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const shown = on !== false;
  return (
    <li className={`rounded-xl border ${shown ? "border-line bg-surface" : "border-line bg-bg-alt/50"}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${shown ? "text-ink" : "text-ink-faint"}`}>{name}</p>
          <p className="text-xs text-ink-faint">{help}</p>
        </div>
        {on === null ? (
          <span className="text-xs font-medium text-ink-faint">Always shown</span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-medium text-ink-soft">
            {on ? "Shown" : "Hidden"}
            <Switch on={on} onChange={onToggle} label={`Show ${name}`} />
          </span>
        )}
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${name} up`} className="rounded-md border border-line p-1.5 text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30">
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${name} down`} className="rounded-md border border-line p-1.5 text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30">
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
          Edit <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      {open && <div className="space-y-4 border-t border-line px-4 py-4">{children}</div>}
    </li>
  );
}

/**
 * The Rankings page of a college, set up in one place: its heading, then each part of the page in the order it
 * appears. Each part has a switch to show or hide it, arrows to move it, and an Edit button for its words. Empty
 * text means the usual wording. Saved with the Save button.
 */
export function RankingsPageCard({ record, update, pools, slug, entries, pinned }: EditorProps & { entries: CollegeRankingEntry[]; /** The slug of the pinned ranking list. */ pinned?: string }) {
  const cfg: RankingsPageConfig = { ...DEFAULT_RANKINGS_PAGE, ...(record.detail.rankingsPage ?? {}) };
  const set = (patch: Partial<RankingsPageConfig>) => update((r) => ({ ...r, detail: { ...r.detail, rankingsPage: { ...DEFAULT_RANKINGS_PAGE, ...(r.detail.rankingsPage ?? {}), ...patch } } }));
  const [pick, setPick] = useState("");

  // The top row holds at most two rankings. With none chosen it shows the first two, the pinned one first.
  const defaults = [...entries].sort((a, b) => Number(b.slug === (pinned ?? "")) - Number(a.slug === (pinned ?? ""))).slice(0, MAX_TOP).map((e) => e.slug);
  const inTop = cfg.summaryRankings.length > 0 ? cfg.summaryRankings : defaults;
  const toggleTop = (listSlug: string) => {
    if (inTop.includes(listSlug)) return set({ summaryRankings: inTop.filter((s) => s !== listSlug) });
    if (inTop.length >= MAX_TOP) return;
    set({ summaryRankings: [...inTop, listSlug] });
  };
  const label = (e: CollegeRankingEntry) => `${e.name}${e.name.includes(String(e.year)) ? "" : ` (${e.year})`}`;

  const peers = cfg.comparePeers;
  const nameOf = (s: string) => pools.colleges.find((c) => c.slug === s)?.name ?? s;
  const peerOptions = pools.colleges.filter((c) => c.slug !== slug && !peers.includes(c.slug));

  const move = (key: RankingsSection, by: -1 | 1) => {
    const order = [...cfg.order];
    const i = order.indexOf(key);
    const j = i + by;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set({ order });
  };

  const body: Record<RankingsSection, React.ReactNode> = {
    summary: (
      <>
        <div>
          <p className="text-sm font-semibold text-ink">Rankings to show <span className="font-normal text-ink-faint">(pick up to two)</span></p>
          {entries.length === 0 ? (
            <p className="mt-1 text-xs text-ink-faint">Add this college to a ranking list above first.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {entries.map((e) => {
                const on = inTop.includes(e.slug);
                const locked = !on && inTop.length >= MAX_TOP;
                return (
                  <li key={e.slug}>
                    <label className={`flex items-center gap-2 text-sm ${locked ? "cursor-not-allowed text-ink-faint" : "cursor-pointer text-ink"}`}>
                      <input type="checkbox" checked={on} disabled={locked} onChange={() => toggleTop(e.slug)} className="h-4 w-4 accent-[var(--color-brand)]" />
                      <span className="min-w-0 truncate">#{e.rank} · {label(e)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Switch on={cfg.showRating} onChange={(v) => set({ showRating: v })} label="Show the student rating" />
          <span className="text-sm text-ink">Show the student rating</span>
        </div>
        {cfg.showRating && <TextInput id="rp-rating-label" label="Its heading" max={40} value={cfg.ratingLabel} onChange={(v) => set({ ratingLabel: v })} placeholder="Student rating" />}
      </>
    ),
    all: <TextInput id="rp-all-title" label="Heading" max={80} value={cfg.allTitle} onChange={(v) => set({ allTitle: v })} placeholder="All Rankings" hint="The number of rankings is added after it." />,
    awards: <TextInput id="rp-awards-title" label="Heading" max={80} value={cfg.awardsTitle} onChange={(v) => set({ awardsTitle: v })} placeholder="Awards & Recognition" hint="Add the awards themselves on the Awards tab." />,
    compare: (
      <>
        <TextInput id="rp-cmp-title" label="Heading" max={120} value={cfg.compareTitle} onChange={(v) => set({ compareTitle: v })} placeholder="NIRF Rank Among Engineering Peers" />
        <TextArea id="rp-cmp-desc" label="Short description" rows={2} max={300} value={cfg.compareDescription} onChange={(v) => set({ compareDescription: v })} hint="Empty: the usual line under the heading." />
        <div>
          <p className="text-sm font-semibold text-ink">Compare with <span className="font-normal text-ink-faint">(optional)</span></p>
          <p className="text-xs text-ink-faint">Choose colleges, or leave it empty and the nearest ones in its category are used. Only colleges with a rank are shown.</p>
          {peers.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {peers.map((s) => (
                <li key={s} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-alt/60 py-1 pl-3 pr-1.5 text-sm text-ink">
                  {nameOf(s)}
                  <button type="button" onClick={() => set({ comparePeers: peers.filter((x) => x !== s) })} aria-label={`Remove ${nameOf(s)}`} className="rounded-full p-1 text-ink-faint transition hover:bg-line hover:text-red-700">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {peers.length < 12 && (
            <select
              aria-label="Add a college to compare with"
              value={pick}
              onChange={(e) => {
                if (e.target.value) set({ comparePeers: [...peers, e.target.value] });
                setPick("");
              }}
              className="mt-2 w-full max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="">Add a college…</option>
              {peerOptions.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </>
    ),
  };

  return (
    <Card title="Rankings page" description="What visitors see on this college's Rankings tab, top to bottom. Switch a part off to hide it, use the arrows to move it, and press Edit to change its words. Saved with the Save button.">
      <div className="rounded-xl border border-line bg-bg-alt/40 p-4">
        <p className="text-sm font-semibold text-ink">Page heading</p>
        <div className="mt-3 space-y-3">
          <TextInput id="rp-heading" label="Heading" max={140} value={cfg.heading} onChange={(v) => set({ heading: v })} placeholder={`${record.name || "This college"} Rankings`} />
          <TextArea id="rp-desc" label="Description" rows={2} max={300} value={cfg.description} onChange={(v) => set({ description: v })} hint="Empty: the usual line." />
        </div>
      </div>

      <ol className="space-y-3">
        {cfg.order.map((key, i) => {
          const part = PARTS[key];
          return (
            <PartRow
              key={key}
              index={i}
              count={cfg.order.length}
              name={part.name}
              help={part.help}
              on={part.flag ? Boolean(cfg[part.flag]) : null}
              onToggle={(v) => part.flag && set({ [part.flag]: v } as Partial<RankingsPageConfig>)}
              onMove={(by) => move(key, by)}
            >
              {body[key]}
            </PartRow>
          );
        })}
      </ol>
    </Card>
  );
}
