"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, FolderPlus, Search, Trash2, Users, X } from "lucide-react";
import { loadLinkInstitutes, saveNavMenu } from "@/lib/admin-actions";
import type { NavGroupConfig, NavItemConfig, NavMenuConfig } from "@/lib/api";
import { customSource, ordered, type SourceGroup } from "@/components/colleges-menu-data";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";

const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const iconButton = "grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft";
const ghostButton = "rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand";
const primaryButton = "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50";

type CollectionLink = { slug: string; title: string; href: string };

const emptyGroup = (): NavGroupConfig => ({ label: "", hidden: false, limit: 0, order: [], items: {} });
const emptyItem = (): NavItemConfig => ({ label: "", hidden: false, seoTitle: "", seoDescription: "", excluded: [] });
const newId = () => `custom-${(Math.random().toString(36) + "00000000").slice(2, 10)}`;

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
      Object.entries(c.items).filter(([k, v]) => keys.has(k) && (v.label || v.hidden || v.seoTitle || v.seoDescription || v.excluded.length > 0)),
    );
    const order = c.order.filter((k) => keys.has(k));
    if (c.label || c.hidden || c.limit || order.length || Object.keys(items).length) groups[g.id] = { ...c, order, items };
  }
  return { order: config.order.filter((id) => source.some((g) => g.id === id)), groups, custom: config.custom };
}

/**
 * Sections → Navigation: what the header's "Top Ranked Colleges" menu shows. The groups and links
 * come from the directory; this decides which are shown, in what order, under what name, the page
 * title and description each link's listing page gets, and which institutes a link leaves out. It
 * also adds categories of its own, each made of collections.
 */
export function NavMenuAdmin({ source: builtIn, links, initial }: { source: SourceGroup[]; links: CollectionLink[]; initial: NavMenuConfig }) {
  const router = useRouter();
  const [config, setConfig] = useState<NavMenuConfig>(initial);
  const [activeId, setActiveId] = useState(builtIn[0]?.id ?? "");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  /** The category dialog: adding a new one (`id` empty) or choosing the collections of an added one. */
  const [picker, setPicker] = useState<{ id: string } | null>(null);
  const [viewing, setViewing] = useState<{ groupId: string; key: string; label: string; href: string } | null>(null);

  const source = useMemo(() => [...builtIn, ...customSource(config.custom, links)], [builtIn, config.custom, links]);
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

  // Where each collection already is: in an added category, or in the built-in Featured Collections.
  const usedIn = useMemo(() => {
    const used = new Map<string, { groupId: string; label: string }>();
    for (const g of source) {
      if (g.id !== "collection" && !g.custom) continue;
      for (const item of g.items) used.set(item.key, { groupId: g.id, label: groupConfig(g.id).label || g.label });
    }
    return used;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, config.groups]);

  const addCategory = (label: string, collections: string[]) => {
    const id = newId();
    change((c) => ({ ...c, custom: [...c.custom, { id, label, collections }] }));
    setActiveId(id);
    setOpenItem(null);
    setPicker(null);
  };
  const setCollections = (id: string, collections: string[]) => {
    change((c) => ({ ...c, custom: c.custom.map((x) => (x.id === id ? { ...x, collections } : x)) }));
    setPicker(null);
  };
  const renameCustom = (id: string, label: string) => change((c) => ({ ...c, custom: c.custom.map((x) => (x.id === id ? { ...x, label } : x)) }));
  const removeFromCustom = (id: string, slug: string) => change((c) => ({ ...c, custom: c.custom.map((x) => (x.id === id ? { ...x, collections: x.collections.filter((s) => s !== slug) } : x)) }));
  const deleteCustom = (id: string) => {
    change((c) => {
      const groups = { ...c.groups };
      delete groups[id];
      return { order: c.order.filter((x) => x !== id), groups, custom: c.custom.filter((x) => x.id !== id) };
    });
    setActiveId(builtIn[0]?.id ?? "");
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const blank = config.custom.find((c) => !c.label.trim());
      if (blank) return setMessage({ kind: "error", text: "Every added category needs a name." });
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
  const custom = group?.custom ? config.custom.find((c) => c.id === group.id) : undefined;
  const takenNames = source.map((g) => (groupConfig(g.id).label || g.label).toLowerCase());

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Navigation"
        description="The “Top Ranked Colleges” menu in the site header. The groups and links come from the directory, so a new course or city appears on its own. Here you choose which to show, their order and names, which institutes each link opens, and the page title and description each link's listing page gets. You can also add categories of your own, made of collections."
        actions={
          <button type="button" onClick={save} disabled={pending || !dirty} className={primaryButton}>
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
        <AdminSection
          title="Categories"
          description="Order, and whether each is shown."
          actions={
            <button type="button" onClick={() => setPicker({ id: "" })} disabled={config.custom.length >= 12} className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40">
              <FolderPlus className="h-4 w-4" aria-hidden="true" /> Add
            </button>
          }
        >
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
                    <span className="text-xs font-normal text-ink-faint">{g.items.length} links{g.custom ? " · added by you" : ""}{c.hidden ? " · hidden" : ""}</span>
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
              <>
                {custom && (
                  <>
                    <button type="button" onClick={() => setPicker({ id: custom.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white">
                      <FolderPlus className="h-4 w-4" aria-hidden="true" /> Choose collections
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete the “${custom.label}” category from the menu? The collections themselves are not deleted.`) && deleteCustom(custom.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-red-700 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setGroup(group.id, { hidden: !gc.hidden })} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
                  {gc.hidden ? <><Eye className="h-4 w-4" /> Show category</> : <><EyeOff className="h-4 w-4" /> Hide category</>}
                </button>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nav-group-label" className="block text-xs font-semibold text-ink">Name in the menu</label>
                {custom ? (
                  <input id="nav-group-label" className={`mt-1.5 ${input}`} value={custom.label} maxLength={60} onChange={(e) => renameCustom(custom.id, e.target.value)} />
                ) : (
                  <input id="nav-group-label" className={`mt-1.5 ${input}`} value={gc.label} maxLength={60} placeholder={group.label} onChange={(e) => setGroup(group.id, { label: e.target.value })} />
                )}
              </div>
              <div>
                <label htmlFor="nav-group-limit" className="block text-xs font-semibold text-ink">Most links to show</label>
                <input id="nav-group-limit" type="number" min={0} max={100} className={`mt-1.5 ${input}`} value={gc.limit || ""} placeholder="24 (the default)" onChange={(e) => setGroup(group.id, { limit: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              </div>
            </div>

            {group.items.length === 0 ? (
              <p className="text-sm text-ink-soft">
                {custom ? "No collections in this category yet. Use “Choose collections” to add some." : "The directory has nothing in this category yet, so it is not in the menu."}
              </p>
            ) : (
              <ul className="max-h-[34rem] divide-y divide-line-soft overflow-y-auto rounded-lg border border-line">
                {items.map((item, i) => {
                  const c = gc.items[item.key] ?? emptyItem();
                  const open = openItem === item.key;
                  const hasSeo = Boolean(c.seoTitle || c.seoDescription);
                  // A collection carries its own SEO, set where the collection is edited.
                  const seoHere = !custom && group.id !== "collection";
                  return (
                    <li key={item.key} className={c.hidden ? "bg-bg/60" : ""}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        {custom ? (
                          <button type="button" onClick={() => removeFromCustom(custom.id, item.key)} aria-label={`Remove ${item.label} from this category`} className={`${iconButton} hover:border-red-700 hover:text-red-700`}><X className="h-4 w-4" /></button>
                        ) : (
                          <input type="checkbox" aria-label={`Show ${item.label}`} checked={!c.hidden} onChange={(e) => setItem(group.id, item.key, { hidden: !e.target.checked })} className="h-4 w-4 accent-brand" />
                        )}
                        <input aria-label={`Name for ${item.label}`} className={`${input} ${c.hidden ? "opacity-50" : ""}`} value={c.label} maxLength={80} placeholder={item.label} onChange={(e) => setItem(group.id, item.key, { label: e.target.value })} />
                        <button
                          type="button"
                          onClick={() => setViewing({ groupId: group.id, key: item.key, label: c.label || item.label, href: item.href })}
                          aria-label={`See the institutes under ${item.label}`}
                          title="See the institutes under this link"
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand ${c.excluded.length > 0 ? "border-brand/40 text-brand" : "border-line text-ink-soft"}`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {c.excluded.length > 0 ? `${c.excluded.length} left out` : "Institutes"}
                        </button>
                        {seoHere && (
                          <button type="button" onClick={() => setOpenItem(open ? null : item.key)} aria-expanded={open} className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${hasSeo ? "border-brand/40 text-brand" : "border-line text-ink-soft"} hover:border-brand hover:text-brand`}>
                            SEO <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
                          </button>
                        )}
                        <button type="button" className={iconButton} aria-label={`Move ${item.label} up`} disabled={i === 0} onClick={() => moveItem(group.id, item.key, -1)}><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" className={iconButton} aria-label={`Move ${item.label} down`} disabled={i === items.length - 1} onClick={() => moveItem(group.id, item.key, 1)}><ArrowDown className="h-4 w-4" /></button>
                      </div>
                      {open && seoHere && (
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

      {picker && (
        <CategoryDialog
          key={picker.id || "new"}
          links={links}
          editing={picker.id ? config.custom.find((c) => c.id === picker.id) : undefined}
          usedIn={usedIn}
          takenNames={takenNames}
          onClose={() => setPicker(null)}
          onAdd={addCategory}
          onSetCollections={setCollections}
        />
      )}

      {viewing && (
        <InstitutesDialog
          key={`${viewing.groupId}:${viewing.key}`}
          title={viewing.label}
          href={viewing.href}
          excluded={groupConfig(viewing.groupId).items[viewing.key]?.excluded ?? []}
          onClose={() => setViewing(null)}
          onSave={(excluded) => {
            setItem(viewing.groupId, viewing.key, { excluded });
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Adds a category (a name and some collections) or, for an added one, chooses its collections. A
 * collection already in another category is shown as added there and cannot be picked a second time.
 */
function CategoryDialog({ links, editing, usedIn, takenNames, onClose, onAdd, onSetCollections }: {
  links: CollectionLink[];
  editing?: { id: string; label: string; collections: string[] };
  usedIn: Map<string, { groupId: string; label: string }>;
  takenNames: string[];
  onClose: () => void;
  onAdd: (label: string, collections: string[]) => void;
  onSetCollections: (id: string, collections: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<string[]>(editing?.collections ?? []);
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState("");

  const q = query.trim().toLowerCase();
  const shown = links.filter((l) => !q || l.title.toLowerCase().includes(q));
  const toggle = (slug: string) => setChosen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const submit = () => {
    if (editing) return onSetCollections(editing.id, chosen);
    const label = name.trim();
    if (!label) return setProblem("Give the category a name.");
    if (takenNames.includes(label.toLowerCase())) return setProblem("A category with that name is already in the menu.");
    onAdd(label, chosen);
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={editing ? `Collections in “${editing.label}”` : "Add a category to the menu"}
      description={editing ? "Tick the collections this category links to." : "Name it and choose the collections it links to. Each opens the colleges list with its filters applied."}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>Cancel</button>
          <button type="button" onClick={submit} className={primaryButton}>{editing ? "Done" : "Add category"}</button>
        </>
      }
    >
      <div className="space-y-5">
        {!editing && (
          <div>
            <label htmlFor="new-category-name" className="block text-xs font-semibold text-ink">Category name</label>
            <input id="new-category-name" autoFocus value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setProblem(""); }} placeholder="e.g. Best for Placements" className={`mt-1.5 ${input}`} />
            {problem && <p role="alert" className="mt-1 text-xs text-red-700">{problem}</p>}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink">Collections <span className="font-normal text-ink-faint">({chosen.length} chosen)</span></p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search collections" aria-label="Search collections" className="w-52 rounded-lg border border-line bg-bg py-1.5 pl-8 pr-3 text-xs focus:border-brand focus:outline-none" />
            </div>
          </div>
          {links.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">No published collections yet. Create and publish one in Content → Collections first.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line-soft overflow-y-auto rounded-lg border border-line">
              {shown.map((l) => {
                const elsewhere = usedIn.get(l.slug);
                const taken = elsewhere !== undefined && elsewhere.groupId !== editing?.id;
                const on = chosen.includes(l.slug);
                return (
                  <li key={l.slug}>
                    <label className={`flex items-center gap-3 px-3 py-2.5 ${taken ? "cursor-not-allowed bg-bg/60" : "cursor-pointer hover:bg-bg"}`}>
                      <input type="checkbox" checked={on || taken} disabled={taken} onChange={() => toggle(l.slug)} className="h-4 w-4 accent-brand" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${taken ? "text-ink-faint" : "text-ink"}`}>{l.title}</span>
                        <span className="block truncate text-xs text-ink-faint">{l.href}</span>
                      </span>
                      {taken && <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold">Already added in {elsewhere.label}</span>}
                    </label>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-soft">No collection matches “{query}”.</li>}
            </ul>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

/**
 * The institutes a menu link opens by default, each ticked. Unticking one leaves it out of the list
 * the link opens (a visitor can still find it by searching the colleges page). Institutes left out that
 * no longer match the link are kept as they are.
 */
function InstitutesDialog({ title, href, excluded, onClose, onSave }: {
  title: string;
  href: string;
  excluded: string[];
  onClose: () => void;
  onSave: (excluded: string[]) => void;
}) {
  const [colleges, setColleges] = useState<{ slug: string; name: string; city: string }[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<Set<string>>(new Set(excluded));
  const [query, setQuery] = useState("");

  useEffect(() => {
    let current = true;
    loadLinkInstitutes(href).then((result) => {
      if (!current) return;
      if ("error" in result) setError(result.error);
      else {
        setColleges(result.colleges);
        setTruncated(result.truncated);
      }
    });
    return () => {
      current = false;
    };
  }, [href]);

  const q = query.trim().toLowerCase();
  const shown = (colleges ?? []).filter((c) => !q || `${c.name} ${c.city}`.toLowerCase().includes(q));
  const toggle = (slug: string) => setLeft((prev) => {
    const next = new Set(prev);
    if (!next.delete(slug)) next.add(slug);
    return next;
  });
  const setAll = (include: boolean) => setLeft((prev) => {
    const next = new Set(prev);
    for (const c of shown) {
      if (include) next.delete(c.slug);
      else next.add(c.slug);
    }
    return next;
  });
  const total = colleges?.length ?? 0;
  const included = (colleges ?? []).filter((c) => !left.has(c.slug)).length;
  const loaded = new Set((colleges ?? []).map((c) => c.slug));

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={`Institutes under “${title}”`}
      description="Everything this link opens by default. Untick any to leave it out of the list."
      footer={
        <>
          <button type="button" onClick={onClose} className={ghostButton}>Cancel</button>
          <button type="button" disabled={!colleges} onClick={() => onSave([...excluded.filter((s) => !loaded.has(s)), ...(colleges ?? []).filter((c) => left.has(c.slug)).map((c) => c.slug)])} className={primaryButton}>Done</button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-red-700">{error}</p>
      ) : !colleges ? (
        <p className="text-sm text-ink-soft">Loading the institutes…</p>
      ) : colleges.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">No published institute is under this link right now.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"><Users className="h-4 w-4 text-brand" aria-hidden="true" />{included} of {total} shown{truncated ? " (first 500)" : ""}</p>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button type="button" onClick={() => setAll(true)} className="text-brand hover:underline">Tick all{q ? " shown" : ""}</button>
              <button type="button" onClick={() => setAll(false)} className="text-ink-soft hover:underline">Untick all{q ? " shown" : ""}</button>
            </div>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or city" aria-label="Search institutes" className={input} />
          <ul className="max-h-96 divide-y divide-line-soft overflow-y-auto rounded-lg border border-line">
            {shown.map((c) => (
              <li key={c.slug}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-bg">
                  <input type="checkbox" checked={!left.has(c.slug)} onChange={() => toggle(c.slug)} className="h-4 w-4 accent-brand" />
                  <span className={`min-w-0 flex-1 truncate text-sm ${left.has(c.slug) ? "text-ink-faint line-through" : "text-ink"}`}>{c.name}</span>
                  {c.city && <span className="shrink-0 text-xs text-ink-faint">{c.city}</span>}
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-soft">No institute matches “{query}”.</li>}
          </ul>
        </div>
      )}
    </AdminModal>
  );
}
