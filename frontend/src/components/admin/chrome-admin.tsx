"use client";

import { useEffect, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { mediaUrl } from "@/lib/media";
import { Eye, EyeOff, GripVertical, ImageUp } from "lucide-react";
import { saveSiteChrome } from "@/lib/admin-actions";
import type { HeaderItemConfig, LogoConfig, SiteChrome } from "@/lib/api";
import { arrangeFooter, CHROME_DEFAULTS, HEADER_DEFAULT_LABEL, type FooterColumn } from "@/lib/chrome-order";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { StatusMessage, useFlash } from "@/components/admin/status-message";
import { BrandLogo } from "@/components/brand-logo";

/**
 * A list whose items are dragged into a new order. Plain HTML drag and drop, so there is nothing to
 * install; each list keeps its own drag state, and an item stops its events at its own list, so dragging
 * a footer link never moves its column and the other way round.
 */
function Sortable<T>({
  items,
  keyOf,
  onChange,
  className,
  render,
}: {
  items: T[];
  keyOf: (item: T) => string;
  onChange: (next: T[]) => void;
  className?: string;
  render: (item: T, state: { dragging: boolean; over: boolean }) => ReactNode;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const drop = (targetKey: string) => {
    if (dragKey === null || dragKey === targetKey) return;
    const from = items.findIndex((i) => keyOf(i) === dragKey);
    const to = items.findIndex((i) => keyOf(i) === targetKey);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <ul className={className}>
      {items.map((item) => {
        const key = keyOf(item);
        return (
          <li
            key={key}
            draggable
            onDragStart={(e: DragEvent) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", key);
              setDragKey(key);
            }}
            onDragOver={(e: DragEvent) => {
              if (dragKey === null) return; // not ours: let it bubble to the list that is dragging
              e.preventDefault();
              e.stopPropagation();
              if (overKey !== key) setOverKey(key);
            }}
            onDrop={(e: DragEvent) => {
              if (dragKey === null) return;
              e.preventDefault();
              e.stopPropagation();
              drop(key);
              setDragKey(null);
              setOverKey(null);
            }}
            onDragEnd={() => {
              setDragKey(null);
              setOverKey(null);
            }}
            className={dragKey === key ? "opacity-40" : ""}
          >
            {render(item, { dragging: dragKey === key, over: overKey === key && dragKey !== key })}
          </li>
        );
      })}
    </ul>
  );
}

/** What is wrong with a logo picture of this size, for a header that shows it about 72px tall: too small, or too square to read. */
function logoSizeProblem(width: number, height: number): string | null {
  if (width < 240 || height < 60) return "This picture is smaller than 240 × 60 px, so it will look blurry.";
  if (width / height < 2) return "This picture is nearly square, so it will show small in the header. The logo works best as a wide picture.";
  return null;
}

/** A logo in the preview that opens the dialog when clicked, with a "Change" tag showing on hover. */
function LogoButton({ label, dark = false, onClick, children }: { label: string; dark?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group relative rounded-xl border border-dashed p-2 transition ${dark ? "border-white/30 hover:border-gold hover:bg-white/5" : "border-line hover:border-brand hover:bg-brand-soft/40"}`}
    >
      {children}
      <span className="absolute inset-x-0 -bottom-3 mx-auto flex w-fit items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <ImageUp className="h-3 w-3" aria-hidden="true" />
        Change logo
      </span>
    </button>
  );
}

/** Change one logo: upload a picture, add text (beside the picture, or on its own), or go back to the built-in logo. */
function LogoDialog({ which, value, onApply, onClose, saving }: { which: "header" | "footer"; value: LogoConfig; onApply: (next: LogoConfig) => void; onClose: () => void; saving: boolean }) {
  const [draft, setDraft] = useState<LogoConfig>(value);
  const builtIn = !draft.image && !draft.text;
  // The picture already saved is checked when the dialog opens, not only when one is chosen, so a wrong-sized
  // logo is flagged the next time anyone looks at it.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!draft.image) return;
    let alive = true;
    const img = new window.Image();
    img.onload = () => alive && setSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => alive && setSize(null);
    img.src = mediaUrl(draft.image);
    return () => {
      alive = false;
    };
  }, [draft.image]);
  const problem = !draft.image || !size ? null : logoSizeProblem(size.width, size.height);
  const field = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={which === "header" ? "Header logo" : "Footer logo"}
      description={which === "header" ? "Shown at the left of the header, on white." : "Shown at the bottom of the footer, on the dark background."}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          {!builtIn && (
            <button type="button" onClick={() => setDraft({ image: "", text: "", alt: "" })} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
              Use the built-in logo
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
            Cancel
          </button>
          <button type="button" onClick={() => onApply(draft)} disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {saving ? "Saving…" : "Save logo"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-ink">Picture</p>
          <ImageUploadField kind="site_logo" value={draft.image} onChange={(image) => setDraft((d) => ({ ...d, image }))} fallbackNote="No picture: the built-in logo, or just the text below." />
        </div>
        {problem && (
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            {problem} ({size?.width} × {size?.height} px.) Replace it with a wide picture, about 800 × 220 px.
          </p>
        )}
        <label className="block">
          <span className="block text-xs font-semibold text-ink">
            Text <span className="font-normal text-ink-faint">(optional)</span>
          </span>
          <input value={draft.text} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} placeholder="e.g. TopCollegePath" className={field} />
          <span className="mt-1 block text-xs text-ink-faint">Shown beside the picture. With no picture, the text alone is the logo.</span>
        </label>
        {draft.image && !draft.text && (
          <label className="block">
            <span className="block text-xs font-semibold text-ink">Description for screen readers</span>
            <input value={draft.alt} maxLength={140} onChange={(e) => setDraft((d) => ({ ...d, alt: e.target.value }))} placeholder="TopCollegePath" className={field} />
          </label>
        )}
        <div className={`rounded-xl border p-4 ${which === "footer" ? "border-white/10 bg-ink" : "border-line bg-white"}`}>
          <p className={`mb-2 text-xs font-semibold ${which === "footer" ? "text-white/60" : "text-ink-faint"}`}>Preview</p>
          <BrandLogo logo={draft} idPrefix={`ctlogo-dialog-${which}`} surface={which === "footer" ? "dark" : "light"} className="h-14 w-auto" />
        </div>
      </div>
    </AdminModal>
  );
}

const grip = <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-faint active:cursor-grabbing" aria-hidden="true" />;

/**
 * Navigation > Header & Footer: the site's header and footer drawn as they look, with the logo to change
 * and the menu links and footer columns to drag into the order they should have. What the links are and
 * where they go is unchanged; this is order, wording and the logo. Save applies it to the whole site.
 */
export function ChromeAdmin({ initial, source }: { initial: SiteChrome; source: FooterColumn[] }) {
  const [saved, setSaved] = useState<SiteChrome>(initial);
  const [headerLogo, setHeaderLogo] = useState<LogoConfig>(initial.headerLogo);
  const [footerLogo, setFooterLogo] = useState<LogoConfig>(initial.footerLogo);
  // Which logo spot is being changed in the dialog.
  const [editingLogo, setEditingLogo] = useState<"header" | "footer" | null>(null);
  const [items, setItems] = useState<HeaderItemConfig[]>(initial.headerItems);
  const [columns, setColumns] = useState<FooterColumn[]>(() => arrangeFooter(source, initial));
  const [pending, startTransition] = useTransition();
  const [flash, showFlash] = useFlash();

  const current: SiteChrome = {
    headerLogo,
    footerLogo,
    headerItems: items,
    footerColumnOrder: columns.map((c) => c.title),
    footerLinkOrder: Object.fromEntries(columns.map((c) => [c.title, c.links.map((l) => l.href)])),
  };
  // What counts as a change: the logo and the header links as saved, and the footer in the order it has now against the saved one.
  const savedColumns = arrangeFooter(source, saved);
  const dirty =
    JSON.stringify(headerLogo) !== JSON.stringify(saved.headerLogo) ||
    JSON.stringify(footerLogo) !== JSON.stringify(saved.footerLogo) ||
    JSON.stringify(items) !== JSON.stringify(saved.headerItems) ||
    JSON.stringify(columns.map((c) => [c.title, c.links.map((l) => l.href)])) !== JSON.stringify(savedColumns.map((c) => [c.title, c.links.map((l) => l.href)]));

  const patchItem = (id: string, change: Partial<HeaderItemConfig>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const setLinks = (title: string, links: FooterColumn["links"]) => setColumns((cols) => cols.map((c) => (c.title === title ? { ...c, links } : c)));

  const save = () =>
    startTransition(async () => {
      const result = await saveSiteChrome(current);
      if ("error" in result) return showFlash("error", result.error);
      setSaved(current);
      showFlash("ok", "Saved. The header and footer are updated on the site.");
    });

  const defaultArrangement = () => {
    setItems(CHROME_DEFAULTS.headerItems);
    setColumns(arrangeFooter(source, CHROME_DEFAULTS));
  };

  return (
    <div className="space-y-6">
      <StatusMessage flash={flash} floating />

      <p className="text-sm text-ink-soft">
        The site&rsquo;s header and footer as visitors see them. Click a logo to change it, drag the grips to reorder, and rename a header link in place.
        Nothing is applied until you save.
      </p>

      <AdminSection title="Header" description="Drag a link to move it. Click the eye to hide it from the menu.">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <LogoButton label="Change the header logo" onClick={() => setEditingLogo("header")}>
              <BrandLogo logo={headerLogo} idPrefix="ctlogo-admin-header" className="h-12 w-auto" />
            </LogoButton>
            <Sortable
              items={items}
              keyOf={(i) => i.id}
              onChange={setItems}
              className="ml-auto flex flex-wrap items-center gap-2"
              render={(item, state) => (
                <div
                  className={`flex items-center gap-1.5 rounded-full border bg-bg-alt px-2.5 py-1.5 text-sm transition ${state.over ? "border-brand ring-2 ring-brand/30" : "border-line"} ${item.hidden ? "opacity-50" : ""}`}
                >
                  {grip}
                  <input
                    value={item.label}
                    maxLength={40}
                    placeholder={HEADER_DEFAULT_LABEL[item.id]}
                    onChange={(e) => patchItem(item.id, { label: e.target.value })}
                    aria-label={`Name of the ${HEADER_DEFAULT_LABEL[item.id]} link`}
                    style={{ width: `${Math.max(6, item.label.length + 1)}ch` }}
                    className="min-w-0 bg-transparent font-medium text-ink-soft focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => patchItem(item.id, { hidden: !item.hidden })}
                    aria-label={item.hidden ? `Show ${item.label}` : `Hide ${item.label}`}
                    aria-pressed={item.hidden}
                    className="text-ink-faint transition hover:text-brand"
                  >
                    {item.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />
            <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-faint">Log in / Register</span>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Footer" description="Drag a column to move it, or a link to move it within its column.">
        <div className="rounded-2xl bg-ink p-5 text-white">
          <Sortable
            items={columns}
            keyOf={(c) => c.title}
            onChange={setColumns}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            render={(col, state) => (
              <div className={`h-full rounded-xl border p-3 transition ${state.over ? "border-gold bg-white/10" : "border-white/10 bg-white/5"}`}>
                <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
                  {grip}
                  <span className="truncate">{col.title}</span>
                </p>
                <Sortable
                  items={col.links}
                  keyOf={(l) => l.href}
                  onChange={(links) => setLinks(col.title, links)}
                  className="mt-2 space-y-1"
                  render={(link, linkState) => (
                    <div className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-white/70 transition ${linkState.over ? "bg-white/20 text-white" : "hover:bg-white/10"}`}>
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-white/40" aria-hidden="true" />
                      <span className="truncate">{link.label}</span>
                    </div>
                  )}
                />
              </div>
            )}
          />
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <LogoButton label="Change the footer logo" dark onClick={() => setEditingLogo("footer")}>
              <BrandLogo logo={footerLogo} idPrefix="ctlogo-admin-footer" surface="dark" className="h-12 w-auto" />
            </LogoButton>
            <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </AdminSection>

      {editingLogo && (
        <LogoDialog
          key={editingLogo}
          which={editingLogo}
          value={editingLogo === "header" ? headerLogo : footerLogo}
          onClose={() => setEditingLogo(null)}
          saving={pending}
          onApply={(next) => {
            // A logo is saved on its own, at once, on top of what is already saved: arrangement changes still
            // waiting for Save are not swept up with it.
            const key = editingLogo === "header" ? "headerLogo" : "footerLogo";
            startTransition(async () => {
              const result = await saveSiteChrome({ ...saved, [key]: next });
              if ("error" in result) return showFlash("error", result.error);
              setSaved((s) => ({ ...s, [key]: next }));
              (key === "headerLogo" ? setHeaderLogo : setFooterLogo)(next);
              setEditingLogo(null);
              showFlash("ok", "Logo saved. It is live on the site and in this panel.");
            });
          }}
        />
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={defaultArrangement} disabled={pending} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
          Put the links and columns back in their original order
        </button>
        {dirty && <span className="text-sm text-amber-800">Unsaved changes</span>}
        <button type="button" onClick={save} disabled={!dirty || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
