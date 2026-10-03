"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHomeContent } from "@/lib/admin-actions";
import { AdminSection } from "@/components/admin/admin-section";

export type LinkDraft = { label: string; href: string };
export type PanelDraft = { title: string; viewAllHref: string; links: LinkDraft[] };
export type TileDraft = { slug: string; title: string; description: string; links: LinkDraft[] };

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** A list of label and path pairs. The server only accepts paths that start with /. */
function LinksEditor({ links, onChange, max }: { links: LinkDraft[]; onChange: (links: LinkDraft[]) => void; max: number }) {
  const set = (i: number, patch: Partial<LinkDraft>) =>
    onChange(links.map((link, index) => (index === i ? { ...link, ...patch } : link)));
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink">Links</p>
      {links.map((link, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
          <label className="min-w-0">
            <span className="sr-only">Link label</span>
            <input aria-label="Link label" value={link.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Label" className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Link path</span>
            <input aria-label="Link path" value={link.href} onChange={(e) => set(i, { href: e.target.value })} placeholder="/colleges" className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none" />
          </label>
          <button type="button" onClick={() => onChange(links.filter((_, index) => index !== i))} className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
        </div>
      ))}
      <button type="button" disabled={links.length >= max} onClick={() => onChange([...links, { label: "", href: "/" }])} className="rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">Add link</button>
    </div>
  );
}

/** Shared save bar: sends the whole list, shows the server's message, refreshes the page. */
function useSave(name: "careers" | "highlights", onSaved: () => void) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const save = (items: unknown[]) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHomeContent(name, items);
      if ("error" in result) setMessage({ kind: "error", text: result.error });
      else {
        setMessage({ kind: "ok", text: "Saved. The homepage now shows this." });
        onSaved();
        router.refresh();
      }
    });
  };
  return { save, message, pending };
}

function SaveBar({ message, pending, onSave, dirty }: { message: { kind: "ok" | "error"; text: string } | null; pending: boolean; onSave: () => void; dirty: boolean }) {
  return (
    <div className="space-y-3">
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${message.kind === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-line bg-bg-alt text-ink-soft"}`}>
          {message.text}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={pending || !dirty} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {dirty && !pending && <span className="text-xs text-ink-soft">Unsaved changes</span>}
      </div>
    </div>
  );
}

export function CareerPanelsEditor({ panels: initial }: { panels: PanelDraft[] }) {
  const [panels, setPanels] = useState<PanelDraft[]>(initial);
  const [dirty, setDirty] = useState(false);
  const { save, message, pending } = useSave("careers", () => setDirty(false));
  const edit = (next: PanelDraft[]) => { setPanels(next); setDirty(true); };
  const set = (i: number, patch: Partial<PanelDraft>) => edit(panels.map((p, index) => (index === i ? { ...p, ...patch } : p)));

  return (
    <AdminSection title="Explore careers" description="The panels in the three columns under the homepage search. The middle column stacks the second and third panels.">
      <div className="space-y-4">
        {panels.map((panel, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <button type="button" aria-label={`Move ${panel.title} up`} disabled={i === 0} onClick={() => edit(move(panels, i, -1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
              <button type="button" aria-label={`Move ${panel.title} down`} disabled={i === panels.length - 1} onClick={() => edit(move(panels, i, 1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
              <div className="min-w-60 flex-1">
                <label className="block text-xs font-semibold text-ink" htmlFor={`panel-${i}-title`}>Title</label>
                <input id={`panel-${i}-title`} value={panel.title} onChange={(e) => set(i, { title: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
              </div>
              <div className="min-w-60 flex-1">
                <label className="block text-xs font-semibold text-ink" htmlFor={`panel-${i}-href`}>&ldquo;View all&rdquo; path</label>
                <input id={`panel-${i}-href`} value={panel.viewAllHref} onChange={(e) => set(i, { viewAllHref: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
              </div>
              <button type="button" onClick={() => edit(panels.filter((_, index) => index !== i))} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:border-red-700 hover:text-red-700">Remove panel</button>
            </div>
            <LinksEditor links={panel.links} max={12} onChange={(links) => set(i, { links })} />
          </div>
        ))}
        {panels.length < 6 && (
          <button type="button" onClick={() => edit([...panels, { title: "", viewAllHref: "/", links: [{ label: "", href: "/" }] }])} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">Add panel</button>
        )}
        <SaveBar message={message} pending={pending} dirty={dirty} onSave={() => save(panels)} />
      </div>
    </AdminSection>
  );
}

export function DataTilesEditor({ tiles: initial }: { tiles: TileDraft[] }) {
  const [tiles, setTiles] = useState<TileDraft[]>(initial);
  const [dirty, setDirty] = useState(false);
  const { save, message, pending } = useSave("highlights", () => setDirty(false));
  const edit = (next: TileDraft[]) => { setTiles(next); setDirty(true); };
  const set = (i: number, patch: Partial<TileDraft>) => edit(tiles.map((t, index) => (index === i ? { ...t, ...patch } : t)));

  return (
    <AdminSection title="Data tiles" description="The two-by-two grid of facts about the directory. Order runs left to right, top to bottom.">
      <div className="space-y-4">
        {tiles.map((tile, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <button type="button" aria-label={`Move ${tile.title} up`} disabled={i === 0} onClick={() => edit(move(tiles, i, -1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
              <button type="button" aria-label={`Move ${tile.title} down`} disabled={i === tiles.length - 1} onClick={() => edit(move(tiles, i, 1))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
              <div className="min-w-60 flex-1">
                <label className="block text-xs font-semibold text-ink" htmlFor={`tile-${i}-title`}>Title</label>
                <input id={`tile-${i}-title`} value={tile.title} onChange={(e) => set(i, { title: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
              </div>
              <div className="min-w-60 flex-1">
                <label className="block text-xs font-semibold text-ink" htmlFor={`tile-${i}-slug`}>Identifier</label>
                <input id={`tile-${i}-slug`} value={tile.slug} onChange={(e) => set(i, { slug: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
              </div>
              <button type="button" onClick={() => edit(tiles.filter((_, index) => index !== i))} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:border-red-700 hover:text-red-700">Remove tile</button>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-ink" htmlFor={`tile-${i}-desc`}>Description</label>
              <textarea id={`tile-${i}-desc`} rows={2} value={tile.description} onChange={(e) => set(i, { description: e.target.value })} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none" />
            </div>
            <LinksEditor links={tile.links} max={8} onChange={(links) => set(i, { links })} />
          </div>
        ))}
        {tiles.length < 8 && (
          <button type="button" onClick={() => edit([...tiles, { slug: "", title: "", description: "", links: [{ label: "", href: "/" }] }])} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white">Add tile</button>
        )}
        <SaveBar message={message} pending={pending} dirty={dirty} onSave={() => save(tiles)} />
      </div>
    </AdminSection>
  );
}
