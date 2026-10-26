"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { saveNavMenu } from "@/lib/admin-actions";
import type { NavGroupConfig, NavItemConfig, NavMenuConfig } from "@/lib/api";
import { ordered, type SourceGroup } from "@/components/colleges-menu-data";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const iconButton = "grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft";

const emptyGroup = (): NavGroupConfig => ({ label: "", hidden: false, limit: 0, order: [], items: {} });
const emptyItem = (): NavItemConfig => ({ label: "", hidden: false, seoTitle: "", seoDescription: "" });

/** Moves the entry at `from` by `by` places. */
function move<T>(list: T[], from: number, by: number): T[] {
  const to = from + by;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Drops what says nothing, and what refers to links the directory no longer has, so the saved record stays small. */
function tidy(config: NavMenuConfig, source: SourceGroup[]): NavMenuConfig {
  const groups: NavMenuConfig["groups"] = {};
  for (const g of source) {
    const c = config.groups[g.id];
    if (!c) continue;
    const keys = new Set(g.items.map((i) => i.key));
    const items = Object.fromEntries(
      Object.entries(c.items).filter(([k, v]) => keys.has(k) && (v.label || v.hidden || v.seoTitle || v.seoDescription)),
    );
    const order = c.order.filter((k) => keys.has(k));
    if (c.label || c.hidden || c.limit || order.length || Object.keys(items).length) groups[g.id] = { ...c, order, items };
  }
  return { order: config.order.filter((id) => source.some((g) => g.id === id)), groups };
}

/**
 * Sections → Navigation: what the header's "Top Ranked Colleges" menu shows. The groups and links
 * still come from the directory; this decides which are shown, in what order, under what name, and
 * the page title and description each link's listing page gets.
 */
export function NavMenuAdmin({ source, initial }: { source: SourceGroup[]; initial: NavMenuConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<NavMenuConfig>(initial);
  const [activeId, setActiveId] = useState(source[0]?.id ?? "");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = ordered(source, config.order, (g) => g.id);
  const group = source.find((g) => g.id === activeId) ?? groups[0];
  const groupConfig = (id: string) => config.groups[id] ?? emptyGroup();

  const change = (fn: (c: NavMenuConfig) => NavMenuConfig) => {
    setConfig(fn);
    setDirty(true);
    setMessage(null);
  };
  const setGroup = (id: string, patch: Partial<NavGroupConfig>) =>
    change((c) => ({ ...c, groups: { ...c.groups, [id]: { ...(c.groups[id] ?? emptyGroup()), ...patch } } }));
  const setItem = (id: string, key: string, patch: Partial<NavItemConfig>) => {
    const g = groupConfig(id);
    setGroup(id, { items: { ...g.items, [key]: { ...(g.items[key] ?? emptyItem()), ...patch } } });
  };

  const moveGroup = (id: string, by: number) =>
    change((c) => {
      const ids = ordered(source, c.order, (g) => g.id).map((g) => g.id);
      return { ...c, order: move(ids, ids.indexOf(id), by) };
    });
  const moveItem = (id: string, key: string, by: number) => {
    const g = source.find((s) => s.id === id);
    if (!g) return;
    const keys = ordered(g.items, groupConfig(id).order, (i) => i.key).map((i) => i.key);
    setGroup(id, { order: move(keys, keys.indexOf(key), by) });
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveNavMenu(tidy(config, source));
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setDirty(false);
      setMessage({ kind: "ok", text: "Saved. The header menu is updated." });
      router.refresh();
    });
  };

  const gc = group ? groupConfig(group.id) : emptyGroup();
  const items = group ? ordered(group.items, gc.order, (i) => i.key) : [];
  const shown = items.filter((i) => !gc.items[i.key]?.hidden).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Navigation"
        description="The “Top Ranked Colleges” menu in the site header. The groups and links come from the directory, so a new course or city appears on its own. Here you choose which to show, their order and names, and the page title and description each link's listing page gets."
        actions={
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        }
      />
      {message && (
        <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <AdminSection title="Categories" description="Order, and whether each is shown.">
          <ul className="-my-2 divide-y divide-line-soft">
            {groups.map((g, i) => {
              const c = groupConfig(g.id);
              const on = g.id === group?.id;
              return (
                <li key={g.id} className="flex items-center gap-1.5 py-2">
                  <button
                    type="button"
                    onClick={() => { setActiveId(g.id); setOpenItem(null); }}
                    className={`min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-left text-sm ${on ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink hover:bg-bg"} ${c.hidden ? "opacity-50" : ""}`}
                  >
                    <span className="block truncate">{c.label || g.label}</span>
                    <span className="text-xs font-normal text-ink-faint">{g.items.length} links{c.hidden ? " · hidden" : ""}</span>
                  </button>
                  <button type="button" className={iconButton} aria-label={`Move ${g.label} up`} disabled={i === 0} onClick={() => moveGroup(g.id, -1)}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className={iconButton} aria-label={`Move ${g.label} down`} disabled={i === groups.length - 1} onClick={() => moveGroup(g.id, 1)}><ArrowDown className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        </AdminSection>

        {group && (
          <AdminSection
            title={gc.label || group.label}
            description={gc.hidden ? "This category is hidden from the menu." : `${shown} of ${group.items.length} links shown.`}
            actions={
              <button type="button" onClick={() => setGroup(group.id, { hidden: !gc.hidden })} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
                {gc.hidden ? <><Eye className="h-4 w-4" /> Show category</> : <><EyeOff className="h-4 w-4" /> Hide category</>}
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nav-group-label" className="block text-xs font-semibold text-ink">Name in the menu</label>
                <input id="nav-group-label" className={`mt-1.5 ${input}`} value={gc.label} maxLength={60} placeholder={group.label} onChange={(e) => setGroup(group.id, { label: e.target.value })} />
              </div>
              <div>
                <label htmlFor="nav-group-limit" className="block text-xs font-semibold text-ink">Most links to show</label>
                <input id="nav-group-limit" type="number" min={0} max={100} className={`mt-1.5 ${input}`} value={gc.limit || ""} placeholder="24 (the default)" onChange={(e) => setGroup(group.id, { limit: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              </div>
            </div>

            {group.items.length === 0 ? (
              <p className="text-sm text-ink-soft">The directory has nothing in this category yet, so it is not in the menu.</p>
            ) : (
              <ul className="max-h-[34rem] divide-y divide-line-soft overflow-y-auto rounded-lg border border-line">
                {items.map((item, i) => {
                  const c = gc.items[item.key] ?? emptyItem();
                  const open = openItem === item.key;
                  const hasSeo = Boolean(c.seoTitle || c.seoDescription);
                  return (
                    <li key={item.key} className={c.hidden ? "bg-bg/60" : ""}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input type="checkbox" aria-label={`Show ${item.label}`} checked={!c.hidden} onChange={(e) => setItem(group.id, item.key, { hidden: !e.target.checked })} className="h-4 w-4 accent-brand" />
                        <input aria-label={`Name for ${item.label}`} className={`${input} ${c.hidden ? "opacity-50" : ""}`} value={c.label} maxLength={80} placeholder={item.label} onChange={(e) => setItem(group.id, item.key, { label: e.target.value })} />
                        <button type="button" onClick={() => setOpenItem(open ? null : item.key)} aria-expanded={open} className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${hasSeo ? "border-brand/40 text-brand" : "border-line text-ink-soft"} hover:border-brand hover:text-brand`}>
                          SEO <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                        </button>
                        <button type="button" className={iconButton} aria-label={`Move ${item.label} up`} disabled={i === 0} onClick={() => moveItem(group.id, item.key, -1)}><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" className={iconButton} aria-label={`Move ${item.label} down`} disabled={i === items.length - 1} onClick={() => moveItem(group.id, item.key, 1)}><ArrowDown className="h-4 w-4" /></button>
                      </div>
                      {open && (
                        <div className="space-y-3 border-t border-line-soft bg-bg/60 px-4 py-3">
                          <p className="text-xs text-ink-faint">For the page this link opens: <span className="font-mono">{item.href}</span>. Leave empty and the page writes its own.</p>
                          <div>
                            <label className="block text-xs font-semibold text-ink">Page title <span className="font-normal text-ink-faint">({c.seoTitle.length}/120)</span></label>
                            <input className={`mt-1.5 ${input}`} value={c.seoTitle} maxLength={120} onChange={(e) => setItem(group.id, item.key, { seoTitle: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-ink">Meta description <span className="font-normal text-ink-faint">({c.seoDescription.length}/320)</span></label>
                            <textarea rows={2} className={`mt-1.5 ${input}`} value={c.seoDescription} maxLength={320} onChange={(e) => setItem(group.id, item.key, { seoDescription: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminSection>
        )}
      </div>
    </div>
  );
}
