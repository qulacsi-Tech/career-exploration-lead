"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveHomeContent } from "@/lib/admin-actions";
import type { LinkPool } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSection } from "@/components/admin/admin-section";
import { LinkRowsEditor, PagePicker, type LinkDraft } from "@/components/admin/link-rows-editor";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The two stored homepage lists, edited the same way as the other homepage tabs: a table, and
  one dialog for adding and editing an item.

    Explore careers   panels of links under the homepage search (up to 6)
    Data              the tiles of facts about the directory (up to 8)

  Order, delete and a dialog Save each store the whole list at once. Links are chosen from the
  pages that already exist (categories, exams, courses, colleges, cities and so on).
*/

export type PanelDraft = { title: string; category: string; viewAllHref: string; links: LinkDraft[] };
export type TileDraft = { slug: string; title: string; description: string; links: LinkDraft[] };

const inputClass = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Keeps a stored list, saves the whole of it on every change, and puts the old one back if the save fails. */
function useStoredList<T>(name: "careers" | "highlights", initial: T[]) {
  const router = useRouter();
  const [list, setList] = useState<T[]>(initial);
  const [seen, setSeen] = useState(initial);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();

  if (initial !== seen) {
    setSeen(initial);
    setList(initial);
  }

  /** Resolves to an error message, or null when saved. */
  const persist = (next: T[], success: string): Promise<string | null> => {
    const previous = list;
    setList(next);
    clearFlash();
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await saveHomeContent(name, next);
        if ("error" in result) {
          setList(previous);
          showFlash("error", `Not saved: ${result.error}`);
          resolve(result.error);
        } else {
          showFlash("ok", success);
          router.refresh();
          resolve(null);
        }
      });
    });
  };
  return { list, persist, flash, pending };
}

/** The table both lists share: one row per item, with order, Edit and Delete. */
function ItemTable<T>({
  rows,
  noun,
  columns,
  nameOf,
  pending,
  onMove,
  onEdit,
  onDelete,
}: {
  rows: T[];
  noun: string;
  columns: { label: string; render: (row: T) => ReactNode }[];
  nameOf: (row: T) => string;
  pending: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
            <th scope="col" className="w-12 px-3 py-2.5 font-semibold">#</th>
            {columns.map((c) => (
              <th key={c.label} scope="col" className="px-3 py-2.5 font-semibold">{c.label}</th>
            ))}
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line-soft align-top last:border-b-0">
              <td className="px-3 py-3 text-xs font-semibold text-ink-soft">{i + 1}</td>
              {columns.map((c) => (
                <td key={c.label} className="px-3 py-3">{c.render(row)}</td>
              ))}
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button type="button" aria-label={`Move ${nameOf(row)} up`} disabled={i === 0 || pending} onClick={() => onMove(i, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
                  <button type="button" aria-label={`Move ${nameOf(row)} down`} disabled={i === rows.length - 1 || pending} onClick={() => onMove(i, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
                  <button type="button" onClick={() => onEdit(i)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">Edit</button>
                  {confirming === i ? (
                    <>
                      <button type="button" disabled={pending} onClick={() => { setConfirming(null); onDelete(i); }} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Yes, delete</button>
                      <button type="button" onClick={() => setConfirming(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">Keep</button>
                    </>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => setConfirming(i)} aria-label={`Delete ${noun} ${nameOf(row)}`} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">Delete</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinksCell({ links }: { links: LinkDraft[] }) {
  return (
    <>
      <p className="text-xs font-semibold text-ink-soft">{links.length} link{links.length === 1 ? "" : "s"}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{links.map((l) => l.label).filter(Boolean).join(" · ")}</p>
    </>
  );
}

/** Footer shared by both dialogs. */
function ModalFooter({ error, canSave, pending, onCancel, onSave, label }: { error: string | null; canSave: boolean; pending: boolean; onCancel: () => void; onSave: () => void; label: string }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      <div className="ml-auto flex items-center gap-3">
        <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onSave} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">{pending ? "Saving…" : label}</button>
      </div>
    </div>
  );
}

const cleanLinks = (links: LinkDraft[]) => links.map((l) => ({ label: l.label.trim(), href: l.href.trim() })).filter((l) => l.label && l.href);

// ── Explore careers ──────────────────────────────────────────────────────────

const MAX_PANELS = 6;

function PanelModal({ panel, pool, categories, onSave, onClose }: { panel: PanelDraft | null; pool: LinkPool; categories: string[]; onSave: (next: PanelDraft) => Promise<string | null>; onClose: () => void }) {
  const [draft, setDraft] = useState<PanelDraft>(panel ? { ...panel, category: panel.category ?? "" } : { title: "", category: "", viewAllHref: "/colleges", links: [{ label: "", href: "/colleges" }] });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const links = cleanLinks(draft.links);
  const canSave = draft.title.trim().length >= 2 && links.length >= 1;

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={panel ? `Edit ${panel.title}` : "Add a careers panel"}
      description="A card of links in the Explore careers section: its title, the page its View all goes to, and its links."
      footer={<ModalFooter error={error} canSave={canSave} pending={pending} onCancel={onClose} label={panel ? "Save" : "Add panel"} onSave={() => startTransition(async () => {
        const failed = await onSave({ ...draft, title: draft.title.trim(), links });
        if (failed) setError(failed); else onClose();
      })} />}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="panel-title" className="block text-xs font-semibold text-ink">Title <span className="text-brand">*</span></label>
            <input id="panel-title" maxLength={80} value={draft.title} onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setError(null); }} className={inputClass} placeholder="e.g. Top MBA colleges" />
            <p className="mt-1 text-xs text-ink-faint">{draft.title.length}/80</p>
          </div>
          <div>
            <label htmlFor="panel-category" className="block text-xs font-semibold text-ink">Category tab</label>
            <select id="panel-category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputClass}>
              <option value="">All categories</option>
              {/* A panel saved under a name that is no longer in the list stays selectable. */}
              {(draft.category && !categories.includes(draft.category) ? [draft.category, ...categories] : categories).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">The panel shows under this tab on the homepage. &ldquo;All categories&rdquo; shows it under every tab.</p>
          </div>
          <PagePicker id="panel-viewall" label="“View all” goes to" value={draft.viewAllHref} onChange={(v) => setDraft({ ...draft, viewAllHref: v })} pool={pool} />
        </div>
        <LinkRowsEditor idPrefix="panel" links={draft.links} onChange={(l) => { setDraft({ ...draft, links: l }); setError(null); }} pool={pool} max={12} />
      </div>
    </AdminModal>
  );
}

export function CareerPanelsManager({ panels, pool, categories }: { panels: PanelDraft[]; pool: LinkPool; categories: string[] }) {
  const { list, persist, flash, pending } = useStoredList<PanelDraft>("careers", panels);
  // undefined: closed. -1: adding. An index: editing that panel.
  const [modal, setModal] = useState<number | undefined>(undefined);

  return (
    <AdminSection
      title="Explore careers"
      description="The panels in the Explore careers section. Each shows under a category tab; four or more are laid out as three columns, the middle one stacking two."
      actions={
        <button type="button" disabled={list.length >= MAX_PANELS} onClick={() => setModal(-1)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40">
          Add panel
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-ink">{list.length} of {MAX_PANELS} panels</p>
        <StatusMessage flash={flash} />
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No panels. The Explore careers section will not show on the homepage.</p>
        ) : (
          <ItemTable
            rows={list}
            noun="panel"
            nameOf={(p) => p.title}
            pending={pending}
            columns={[
              { label: "Panel", render: (p) => <span className="font-medium text-ink">{p.title}</span> },
              { label: "Category", render: (p) => <span className="text-xs text-ink-soft">{p.category || "All categories"}</span> },
              { label: "Links", render: (p) => <LinksCell links={p.links} /> },
              { label: "View all", render: (p) => <span className="text-xs text-ink-soft">{p.viewAllHref}</span> },
            ]}
            onMove={(i, d) => persist(move(list, i, d), `Moved ${list[i].title}. Order saved.`)}
            onEdit={setModal}
            onDelete={(i) => persist(list.filter((_, n) => n !== i), `${list[i].title} was deleted.`)}
          />
        )}
      </div>
      {modal !== undefined && (
        <PanelModal
          key={modal}
          panel={modal >= 0 ? list[modal] : null}
          pool={pool}
          categories={categories}
          onClose={() => setModal(undefined)}
          onSave={(next) => persist(modal >= 0 ? list.map((p, i) => (i === modal ? next : p)) : [...list, next], modal >= 0 ? `${next.title} saved.` : `${next.title} was added.`)}
        />
      )}
    </AdminSection>
  );
}

// ── Data tiles ───────────────────────────────────────────────────────────────

const MAX_TILES = 8;

function TileModal({ tile, others, pool, onSave, onClose }: { tile: TileDraft | null; others: string[]; pool: LinkPool; onSave: (next: TileDraft) => Promise<string | null>; onClose: () => void }) {
  const [draft, setDraft] = useState<TileDraft>(tile ?? { slug: "", title: "", description: "", links: [{ label: "", href: "/colleges" }] });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const links = cleanLinks(draft.links);
  const canSave = draft.title.trim().length >= 2 && draft.description.trim().length >= 1 && links.length >= 1;

  const save = () =>
    startTransition(async () => {
      // The identifier is made from the title once and stays the same after a rename.
      let slug = draft.slug || slugify(draft.title) || "tile";
      if (!draft.slug) for (let n = 2; others.includes(slug); n++) slug = `${slugify(draft.title) || "tile"}-${n}`;
      const failed = await onSave({ ...draft, slug, title: draft.title.trim(), description: draft.description.trim(), links });
      if (failed) setError(failed); else onClose();
    });

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={tile ? `Edit ${tile.title}` : "Add a data tile"}
      description="A tile in the two-by-two grid of facts about the directory: its title, a line of text and its links."
      footer={<ModalFooter error={error} canSave={canSave} pending={pending} onCancel={onClose} label={tile ? "Save" : "Add tile"} onSave={save} />}
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="tile-title" className="block text-xs font-semibold text-ink">Title <span className="text-brand">*</span></label>
          <input id="tile-title" maxLength={80} value={draft.title} onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setError(null); }} className={inputClass} placeholder="e.g. Colleges by city" />
          <p className="mt-1 text-xs text-ink-faint">{draft.title.length}/80</p>
        </div>
        <div>
          <label htmlFor="tile-desc" className="block text-xs font-semibold text-ink">Text <span className="text-brand">*</span></label>
          <textarea id="tile-desc" rows={3} maxLength={300} value={draft.description} onChange={(e) => { setDraft({ ...draft, description: e.target.value }); setError(null); }} className={inputClass} />
          <p className="mt-1 text-xs text-ink-faint">{draft.description.length}/300</p>
        </div>
        <LinkRowsEditor idPrefix="tile" links={draft.links} onChange={(l) => { setDraft({ ...draft, links: l }); setError(null); }} pool={pool} max={8} />
      </div>
    </AdminModal>
  );
}

export function DataTilesManager({ tiles, pool }: { tiles: TileDraft[]; pool: LinkPool }) {
  const { list, persist, flash, pending } = useStoredList<TileDraft>("highlights", tiles);
  const [modal, setModal] = useState<number | undefined>(undefined);

  return (
    <AdminSection
      title="Data tiles"
      description="The grid of facts about the directory. Order runs left to right, top to bottom."
      actions={
        <button type="button" disabled={list.length >= MAX_TILES} onClick={() => setModal(-1)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40">
          Add tile
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-ink">{list.length} of {MAX_TILES} tiles</p>
        <StatusMessage flash={flash} />
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No tiles. The Data section will not show on the homepage.</p>
        ) : (
          <ItemTable
            rows={list}
            noun="tile"
            nameOf={(t) => t.title}
            pending={pending}
            columns={[
              { label: "Tile", render: (t) => <span className="font-medium text-ink">{t.title}</span> },
              { label: "Text", render: (t) => <span className="line-clamp-2 max-w-sm text-xs text-ink-soft">{t.description}</span> },
              { label: "Links", render: (t) => <LinksCell links={t.links} /> },
            ]}
            onMove={(i, d) => persist(move(list, i, d), `Moved ${list[i].title}. Order saved.`)}
            onEdit={setModal}
            onDelete={(i) => persist(list.filter((_, n) => n !== i), `${list[i].title} was deleted.`)}
          />
        )}
      </div>
      {modal !== undefined && (
        <TileModal
          key={modal}
          tile={modal >= 0 ? list[modal] : null}
          others={list.filter((_, i) => i !== modal).map((t) => t.slug)}
          pool={pool}
          onClose={() => setModal(undefined)}
          onSave={(next) => persist(modal >= 0 ? list.map((t, i) => (i === modal ? next : t)) : [...list, next], modal >= 0 ? `${next.title} saved.` : `${next.title} was added.`)}
        />
      )}
    </AdminSection>
  );
}
