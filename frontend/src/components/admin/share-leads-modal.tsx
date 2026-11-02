"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Loader2, Search, Send, Undo2 } from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { loadLeadSharing, loadShareableLeads, shareLeads, unshareLead } from "@/lib/admin-actions";
import { LEAD_TYPE_LABEL, formatFull } from "@/lib/lead-labels";
import type { LeadSharing, ShareableLeads, SharedLeadItem } from "@/lib/api";

type Tab = "share" | "shared";

const SELECT = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/**
 * Share leads with a sponsored college, in bulk. The first tab finds leads the college has not been given
 * (only ones whose sender agreed to be contacted): filter by stream, city or type, then either tick the ones to
 * give or type how many of the newest matches to give. The second tab lists what the college already has, with
 * a way to take a lead back. The college's admin sees shared leads in their own Leads inbox.
 */
export function ShareLeadsModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("share");
  const [sharing, setSharing] = useState<LeadSharing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const result = await loadLeadSharing(slug);
    if ("error" in result) setError(result.error);
    else setSharing(result);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the list when the dialog opens
    void reload();
  }, [reload]);

  return (
    <AdminModal open onClose={onClose} size="lg" title={`Share leads with ${name}`} description="Choose leads to give this sponsored college. Its admin sees them in their Leads inbox.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5 border-b border-line pb-3" role="tablist">
          {([["share", "Share leads"], ["shared", `Already shared${sharing ? ` (${sharing.shared.length})` : ""}`]] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === key ? "bg-brand text-white" : "text-ink-soft hover:bg-bg-alt hover:text-brand"}`}>
              {label}
            </button>
          ))}
        </div>

        {note && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"><Check className="h-4 w-4" /> {note}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        {sharing && !sharing.sponsored ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">
            This college is not marked as sponsored yet. Tick <strong>Sponsored college</strong> on College Info, save, and then share leads.
          </p>
        ) : tab === "share" ? (
          <ShareTab
            slug={slug}
            onShared={async (count) => {
              setError(null);
              setNote(`${count} ${count === 1 ? "lead" : "leads"} shared. The college admin has been told.`);
              await reload();
            }}
            onError={(message) => {
              setNote(null);
              setError(message);
            }}
          />
        ) : (
          <SharedTab
            slug={slug}
            items={sharing?.shared ?? null}
            onChanged={async () => {
              setNote("Taken back from the college.");
              await reload();
            }}
            onError={setError}
          />
        )}
      </div>
    </AdminModal>
  );
}

/* ------------------------------------------------------------------ *
   Share
 * ------------------------------------------------------------------ */

function ShareTab({ slug, onShared, onError }: { slug: string; onShared: (count: number) => Promise<void>; onError: (message: string) => void }) {
  const [filters, setFilters] = useState({ stream: "", city: "", type: "", q: "" });
  const [data, setData] = useState<ShareableLeads | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [count, setCount] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const load = useCallback(
    async (f: typeof filters) => {
      setLoading(true);
      const result = await loadShareableLeads(slug, f);
      setLoading(false);
      if ("error" in result) return onError(result.error);
      setData(result);
      setPicked(new Set());
    },
    [slug, onError],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the matching leads when the filters change
    void load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.stream, filters.city, filters.type]);

  const toggle = (id: string) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const run = (payload: { leadIds?: string[]; count?: number }) =>
    start(async () => {
      const result = await shareLeads(slug, { ...payload, ...filters });
      if ("error" in result) return onError(result.error);
      setCount("");
      await onShared(result.shared);
      await load(filters);
    });

  const available = data?.total ?? 0;
  const n = Number(count);
  const countOk = Number.isInteger(n) && n >= 1 && n <= Math.min(500, available);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <select value={filters.stream} onChange={(e) => setFilters((f) => ({ ...f, stream: e.target.value }))} className={SELECT} aria-label="Stream">
          <option value="">All streams</option>
          {data?.options.streams.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} className={SELECT} aria-label="City">
          <option value="">All cities</option>
          {data?.options.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className={SELECT} aria-label="Type">
          <option value="">All types</option>
          {data?.options.types.map((t) => <option key={t} value={t}>{LEAD_TYPE_LABEL[t] ?? t}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); void load(filters); }} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Search name or phone" className={`${SELECT} pl-9`} />
        </form>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-brand-soft/50 p-4">
        <div>
          <p className="font-display text-2xl font-extrabold leading-none text-ink">{loading ? "…" : available}</p>
          <p className="mt-1 text-xs text-ink-soft">leads available to share{filters.stream || filters.city || filters.type || filters.q ? " (with these filters)" : ""}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-ink">
            Share the newest
            <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="e.g. 50" className="ml-2 w-24 rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-brand focus:outline-none" />
          </label>
          <button type="button" disabled={pending || !countOk} onClick={() => run({ count: n })} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Share {countOk ? n : ""}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : data && data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">No leads to share with these filters. Only leads whose sender agreed to be contacted can be shared.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>Showing the newest {data?.items.length}. Tick the ones to share, or use the number above for a bulk share.</span>
            <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setPicked(picked.size === (data?.items.length ?? 0) ? new Set() : new Set(data?.items.map((l) => l.id)))}>
              {picked.size === (data?.items.length ?? 0) ? "Clear" : "Select all shown"}
            </button>
          </div>
          <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {data?.items.map((l) => <LeadRow key={l.id} lead={l} checked={picked.has(l.id)} onToggle={() => toggle(l.id)} />)}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-sm text-ink-soft">{picked.size} selected</span>
            <button type="button" disabled={pending || picked.size === 0} onClick={() => run({ leadIds: [...picked] })} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Share selected
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LeadRow({ lead, checked, onToggle, right }: { lead: SharedLeadItem; checked?: boolean; onToggle?: () => void; right?: React.ReactNode }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-ink">{lead.name}</span>
          <span className="rounded-full bg-bg-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{LEAD_TYPE_LABEL[lead.type] ?? lead.type}</span>
        </div>
        <p className="text-xs text-ink-soft">
          {lead.phone}
          {lead.email ? ` · ${lead.email}` : ""}
          {lead.city ? ` · ${lead.city}` : ""}
          {lead.stream ? ` · ${lead.stream}` : ""}
        </p>
        {(lead.programName || lead.message) && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{lead.programName ? `${lead.programName}. ` : ""}{lead.message}</p>}
        <p className="mt-1 text-[11px] text-ink-faint">
          {lead.sharedAt ? `Shared ${formatFull(lead.sharedAt)}` : `Received ${formatFull(lead.createdAt)}`}
          {lead.collegeSlug ? ` · for ${lead.collegeSlug}` : ""}
        </p>
      </div>
      {right}
    </>
  );
  if (!onToggle) return <li className="flex items-start gap-3 rounded-xl border border-line p-3">{body}</li>;
  return (
    <li>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-brand bg-brand-soft/40" : "border-line hover:border-brand/50"}`}>
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
        {body}
      </label>
    </li>
  );
}

/* ------------------------------------------------------------------ *
   Already shared
 * ------------------------------------------------------------------ */

function SharedTab({ slug, items, onChanged, onError }: { slug: string; items: SharedLeadItem[] | null; onChanged: () => Promise<void>; onError: (message: string | null) => void }) {
  const [pending, start] = useTransition();
  if (!items) return <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (items.length === 0) return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">No leads shared with this college yet.</p>;

  return (
    <ul className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
      {items.map((l) => (
        <LeadRow
          key={l.id}
          lead={l}
          right={
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  onError(null);
                  const result = await unshareLead(slug, l.id);
                  if ("error" in result) return onError(result.error);
                  await onChanged();
                })
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Undo2 className="h-3.5 w-3.5" /> Take back
            </button>
          }
        />
      ))}
    </ul>
  );
}
