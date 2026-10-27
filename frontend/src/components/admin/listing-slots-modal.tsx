"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Image as ImageIcon, LayoutPanelTop, ListFilter, Megaphone, Plus, Trash2 } from "lucide-react";
import { loadListingSlots, loadSlotTargets, resetListingSlots, saveListingSlots } from "@/lib/admin-actions";
import type { ListingPage, ListingSlot, SlotGroup, SlotType } from "@/lib/api";
import type { MenuGroup } from "@/components/colleges-menu";
import { scopeOfHref } from "@/lib/listing-scope";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { ICONS, ListingSlotView, PRESETS } from "@/components/colleges/listing-slot";

const SELECT = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const INPUT = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const TYPES: Record<SlotType, { label: string; Icon: typeof Megaphone }> = {
  banner: { label: "Banner", Icon: LayoutPanelTop },
  filter: { label: "Filter strip", Icon: ListFilter },
  ad: { label: "Ad picture", Icon: ImageIcon },
};

const GROUPS: { id: SlotGroup; label: string; menu?: string; sample?: string[] }[] = [
  { id: "location", label: "Location", menu: "Colleges by Location" },
  { id: "ownership", label: "Ownership", menu: "Colleges by Type" },
  { id: "fees", label: "Total fees", sample: ["< 5 Lakh", "5 - 10 Lakh", "10 - 20 Lakh", "> 20 Lakh"] },
  { id: "course", label: "Course", menu: "Popular Courses" },
  { id: "specialisation", label: "Specialisation", menu: "Popular Specialisations" },
  { id: "exam", label: "Exam accepted", menu: "Exams Accepted" },
  { id: "level", label: "Course level", menu: "Colleges by Level" },
  { id: "mode", label: "Mode of study", menu: "Mode of Study" },
  { id: "ranking", label: "Ranking list", menu: "Top Ranked Colleges" },
  { id: "credential", label: "Credential", sample: ["Degree", "Diploma", "Doctorate"] },
  { id: "approval", label: "Approval", sample: ["AICTE", "UGC", "NAAC"] },
];

const newId = () => Math.random().toString(36).slice(2, 10);

function blank(type: SlotType, after: number): ListingSlot {
  return {
    id: newId(), type, enabled: true, after, every: 0,
    bgMode: "preset", bgPreset: "brand", bgFrom: "#7b1a2a", bgTo: "#ce4355", bgImage: "", tone: "light",
    title: type === "banner" ? "Your headline here" : type === "filter" ? "Filter by location" : "",
    text: "", buttonLabel: type === "banner" ? "Learn more" : "", buttonHref: type === "banner" ? "/enquiry" : "",
    icon: "sparkles", sponsored: type === "ad",
    image: "", href: "", alt: "",
    group: "location", hint: "", limit: 8,
  };
}

/** A button for the colleges admin page that opens the dialog for what sits between the listed colleges. */
export function ListingSlotsButton({ page, label }: { page: ListingPage; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
      >
        <Megaphone className="h-4 w-4" />
        {label}
      </button>
      {open && <SlotsDialog page={page} onClose={() => setOpen(false)} />}
    </>
  );
}

function SlotsDialog({ page, onClose }: { page: ListingPage; onClose: () => void }) {
  const [slots, setSlots] = useState<ListingSlot[] | null>(null);
  const [menu, setMenu] = useState<MenuGroup[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // What the dialog edits: the page's set, or the one written for a selection of the header menu.
  const [targets, setTargets] = useState<MenuGroup[]>([]);
  const [custom, setCustom] = useState<Set<string>>(new Set());
  const [groupLabel, setGroupLabel] = useState("");
  const [scope, setScope] = useState("");
  const [hasOwn, setHasOwn] = useState(true);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSlotTargets(page).then((result) => {
      if (!alive) return;
      if (result.error !== undefined) return setError(result.error);
      setTargets(result.groups);
      setCustom(new Set(result.custom));
    });
    return () => {
      alive = false;
    };
  }, [page]);

  // The set for what is selected: when the dialog opens, when the selection changes, after a reset.
  useEffect(() => {
    let alive = true;
    loadListingSlots(page, scope || undefined).then((result) => {
      if (!alive) return;
      if (result.error !== undefined) return setError(result.error);
      setSlots(result.slots);
      setMenu(result.groups);
      setHasOwn(result.custom);
      setSelected(result.slots[0]?.id ?? "");
    });
    return () => {
      alive = false;
    };
  }, [page, scope, reloads]);

  // Choosing something else clears the list until its own arrives, so the old items are never shown under the new name.
  const changeScope = (next: string) => {
    setSlots(null);
    setSaved(false);
    setError(null);
    setScope(next);
  };
  const reset = () => {
    startTransition(async () => {
      const result = await resetListingSlots(page, scope);
      if ("error" in result) return setError(result.error);
      setCustom((c) => {
        const next = new Set(c);
        next.delete(scope);
        return next;
      });
      setSlots(null);
      setReloads((n) => n + 1);
    });
  };
  const group = targets.find((g) => g.label === groupLabel);
  const url = scope ? `/${page}?${scope}` : `/${page}`;

  const edit = (next: ListingSlot[]) => {
    setSlots(next);
    setSaved(false);
    setError(null);
  };
  const patch = (id: string, change: Partial<ListingSlot>) => slots && edit(slots.map((s) => (s.id === id ? { ...s, ...change } : s)));

  const add = (type: SlotType) => {
    if (!slots) return;
    const item = blank(type, Math.max(0, ...slots.map((s) => s.after)) + 3);
    edit([...slots, item]);
    setSelected(item.id);
  };
  const duplicate = (slot: ListingSlot) => {
    if (!slots) return;
    const copy = { ...slot, id: newId(), after: slot.after + 1 };
    edit([...slots, copy]);
    setSelected(copy.id);
  };
  const remove = (id: string) => {
    if (!slots) return;
    const next = slots.filter((s) => s.id !== id);
    edit(next);
    if (selected === id) setSelected(next[0]?.id ?? "");
  };
  const move = (id: string, by: -1 | 1) => {
    if (!slots) return;
    const i = slots.findIndex((s) => s.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    edit(next);
  };

  const save = () => {
    if (!slots) return;
    startTransition(async () => {
      const result = await saveListingSlots(page, slots, scope || undefined);
      if ("error" in result) return setError(result.error);
      setSaved(true);
      setHasOwn(true);
      if (scope) setCustom((c) => new Set(c).add(scope));
    });
  };

  const current = slots?.find((s) => s.id === selected);

  // Sample chips for a filter strip's preview, from the real menu options.
  const chipsFor = (slot: ListingSlot) => {
    const g = GROUPS.find((x) => x.id === slot.group);
    const labels = g?.menu ? (menu.find((m) => m.label === g.menu)?.items.map((i) => i.label) ?? []) : (g?.sample ?? []);
    return labels.slice(0, slot.limit).map((label) => ({ label, href: "#" }));
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      size="full"
      title="Banners, filters & ads"
      description={`What shows between the listed colleges on ${url}: where, how often and how it looks. The preview on the right is what visitors will see.`}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          {saved && <span className="mr-auto text-sm text-emerald-700">Saved. The listing is updated.</span>}
          {!saved && scope && hasOwn && (
            <button type="button" onClick={reset} disabled={pending} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
              Reset to the page&rsquo;s items
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
            {saved ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!slots || pending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {/* Which list the items belong to: the page, or one item of the header menu. Same choice as Header management. */}
      <div className="mb-5 rounded-xl border border-line bg-bg-alt p-4">
        <p className="text-xs font-semibold text-ink">These items show when a visitor opens</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <select
            aria-label="Menu section"
            value={groupLabel}
            onChange={(e) => {
              setGroupLabel(e.target.value);
              changeScope("");
            }}
            className={SELECT}
          >
            <option value="">All colleges (the page&rsquo;s own items)</option>
            {targets.map((g) => (
              <option key={g.label} value={g.label}>
                {g.label}
              </option>
            ))}
          </select>
          <select aria-label="Menu selection" value={scope} disabled={!group} onChange={(e) => changeScope(e.target.value)} className={`${SELECT} disabled:opacity-50`}>
            <option value="">{group ? "Pick one…" : "—"}</option>
            {group?.items.map((item) => {
              const itemScope = scopeOfHref(item.href);
              return (
                <option key={item.href} value={itemScope}>
                  {custom.has(itemScope) ? "● " : ""}
                  {item.label}
                </option>
              );
            })}
          </select>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {scope
            ? hasOwn
              ? "This selection has its own items. Saving changes them."
              : "This selection shows the page's items. Saving gives it a set of its own, starting from these."
            : "Used for the page and for every selection without its own items."}{" "}
          A &ldquo;●&rdquo; marks selections that already have their own.
        </p>
      </div>

      {!slots && !error && <p className="text-sm text-ink-soft">Loading…</p>}

      {slots && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Left: the list, then the form for the one picked. */}
          <div className="min-w-0 space-y-5">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">Items ({slots.length})</h3>
                <div className="flex gap-1.5">
                  {(Object.keys(TYPES) as SlotType[]).map((type) => {
                    const { label, Icon } = TYPES[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => add(type)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {slots.length === 0 && <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">Nothing between the colleges. Add an item above.</li>}
                {slots.map((slot, i) => {
                  const { Icon } = TYPES[slot.type];
                  const on = slot.id === selected;
                  return (
                    <li key={slot.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${on ? "border-brand bg-brand-soft/50" : "border-line bg-surface"}`}>
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={(e) => patch(slot.id, { enabled: e.target.checked })}
                        aria-label={`Show ${slot.title || TYPES[slot.type].label}`}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                      <button type="button" onClick={() => setSelected(slot.id)} className={`flex min-w-0 flex-1 items-center gap-2 text-left ${slot.enabled ? "" : "opacity-50"}`}>
                        <Icon className="h-4 w-4 shrink-0 text-brand" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{slot.title || (slot.type === "ad" ? slot.alt || "Ad picture" : TYPES[slot.type].label)}</span>
                          <span className="block text-xs text-ink-faint">
                            {TYPES[slot.type].label} · after {slot.after}
                            {slot.every ? `, then every ${slot.every}` : ""}
                          </span>
                        </span>
                      </button>
                      <IconButton label="Move up" disabled={i === 0} onClick={() => move(slot.id, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                      <IconButton label="Move down" disabled={i === slots.length - 1} onClick={() => move(slot.id, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                      <IconButton label="Duplicate" onClick={() => duplicate(slot)}><Copy className="h-4 w-4" /></IconButton>
                      <IconButton label="Delete" danger onClick={() => remove(slot.id)}><Trash2 className="h-4 w-4" /></IconButton>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-ink-faint">Items at the same position show in this order. Untick one to hide it without deleting it.</p>
            </section>

            {current && <SlotForm slot={current} onChange={(change) => patch(current.id, change)} />}
          </div>

          {/* Right: the preview stays in view while the form scrolls. */}
          <div className="min-w-0">
            <div className="space-y-4 lg:sticky lg:top-0">
              <section className="rounded-xl border border-line bg-bg-alt p-4">
                <h3 className="text-sm font-bold text-ink">Preview</h3>
                {current ? (
                  <div className="mt-3 space-y-3" onClickCapture={(e) => (e.target as HTMLElement).closest("a") && e.preventDefault()}>
                    <CollegeStub />
                    <ListingSlotView slot={current} chips={chipsFor(current)} preview />
                    <CollegeStub />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-faint">Pick an item to see it here.</p>
                )}
              </section>

              <PageOrder slots={slots} selected={selected} onPick={setSelected} />
            </div>
          </div>
        </div>
      )}
    </AdminModal>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 text-ink-faint transition hover:bg-bg-alt disabled:opacity-30 ${danger ? "hover:text-red-600" : "hover:text-brand"}`}
    >
      {children}
    </button>
  );
}

function CollegeStub() {
  return (
    <div aria-hidden className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 opacity-70">
      <span className="h-10 w-10 rounded-lg bg-bg-alt" />
      <span className="flex-1 space-y-1.5">
        <span className="block h-2.5 w-2/3 rounded bg-line" />
        <span className="block h-2 w-1/3 rounded bg-line-soft" />
      </span>
    </div>
  );
}

/** The first twenty colleges of a page with the items between them, so the spacing can be judged at a glance. */
function PageOrder({ slots, selected, onPick }: { slots: ListingSlot[]; selected: string; onPick: (id: string) => void }) {
  const rows = useMemo(() => {
    const COUNT = 20;
    const out: { college: number; items: ListingSlot[] }[] = [];
    for (let n = 1; n <= COUNT; n++) {
      const items = slots.filter((s) => s.enabled && n >= s.after && (n === s.after || (s.every > 0 && (n - s.after) % s.every === 0)));
      out.push({ college: n, items: n < COUNT ? items : [] });
    }
    return out;
  }, [slots]);

  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="text-sm font-bold text-ink">Page order <span className="font-normal text-ink-faint">(a page lists 20 colleges)</span></h3>
      <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-sm">
        {rows.map((row) => (
          <li key={row.college}>
            <div className="flex items-center gap-2 text-ink-soft">
              <span className="grid h-5 w-5 place-items-center rounded bg-bg-alt text-[11px] font-semibold">{row.college}</span>
              College
            </div>
            {row.items.map((slot) => {
              const { Icon } = TYPES[slot.type];
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onPick(slot.id)}
                  className={`my-1 ml-7 flex w-[calc(100%-1.75rem)] items-center gap-2 rounded-md border px-2 py-1 text-left text-xs font-medium ${
                    slot.id === selected ? "border-brand bg-brand-soft text-brand-ink" : "border-gold/40 bg-gold-soft text-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{slot.title || TYPES[slot.type].label}</span>
                </button>
              );
            })}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

function SlotForm({ slot, onChange }: { slot: ListingSlot; onChange: (change: Partial<ListingSlot>) => void }) {
  const num = (value: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(value) || min)));
  const styled = slot.type !== "ad";

  return (
    <section className="space-y-5 rounded-xl border border-line p-4">
      <h3 className="text-sm font-bold text-ink">{TYPES[slot.type].label} settings</h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type">
          <select value={slot.type} onChange={(e) => onChange({ type: e.target.value as SlotType })} className={INPUT}>
            {(Object.keys(TYPES) as SlotType[]).map((t) => <option key={t} value={t}>{TYPES[t].label}</option>)}
          </select>
        </Field>
        <Field label="Show after (colleges)">
          <input type="number" min={1} max={100} value={slot.after} onChange={(e) => onChange({ after: num(e.target.value, 1, 100) })} className={INPUT} />
        </Field>
        <Field label="Repeat every" hint="0 shows it once.">
          <input type="number" min={0} max={100} value={slot.every} onChange={(e) => onChange({ every: num(e.target.value, 0, 100) })} className={INPUT} />
        </Field>
      </div>

      {slot.type === "banner" && (
        <div className="space-y-4">
          <Field label="Headline"><input value={slot.title} maxLength={140} onChange={(e) => onChange({ title: e.target.value })} className={INPUT} /></Field>
          <Field label="Text"><textarea rows={2} value={slot.text} maxLength={300} onChange={(e) => onChange({ text: e.target.value })} className={INPUT} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text"><input value={slot.buttonLabel} maxLength={40} onChange={(e) => onChange({ buttonLabel: e.target.value })} className={INPUT} /></Field>
            <Field label="Button link" hint="/compare or https://…"><input value={slot.buttonHref} maxLength={300} onChange={(e) => onChange({ buttonHref: e.target.value })} className={INPUT} /></Field>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">Icon</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map((key) => {
                const { Icon, label } = ICONS[key];
                return (
                  <button key={key} type="button" aria-pressed={slot.icon === key} title={label} onClick={() => onChange({ icon: key })}
                    className={`grid h-9 w-9 place-items-center rounded-lg border ${slot.icon === key ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-soft hover:border-brand"}`}>
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
              <button type="button" aria-pressed={slot.icon === "none"} onClick={() => onChange({ icon: "none" })}
                className={`rounded-lg border px-3 text-xs font-medium ${slot.icon === "none" ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-soft hover:border-brand"}`}>
                None
              </button>
            </div>
          </div>
        </div>
      )}

      {slot.type === "filter" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Filter by">
              <select value={slot.group} onChange={(e) => onChange({ group: e.target.value as SlotGroup })} className={INPUT}>
                {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="How many options">
              <input type="number" min={1} max={20} value={slot.limit} onChange={(e) => onChange({ limit: num(e.target.value, 1, 20) })} className={INPUT} />
            </Field>
          </div>
          <Field label="Title"><input value={slot.title} maxLength={140} onChange={(e) => onChange({ title: e.target.value })} className={INPUT} /></Field>
          <Field label="Small line under the title"><input value={slot.hint} maxLength={140} onChange={(e) => onChange({ hint: e.target.value })} className={INPUT} /></Field>
        </div>
      )}

      {slot.type === "ad" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-ink">Ad picture</p>
            <ImageUploadField kind="banner" value={slot.image} onChange={(image) => onChange({ image })} fallbackNote="Nothing is shown until a picture is added." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link" hint="Where a click goes. /page or https://…"><input value={slot.href} maxLength={300} onChange={(e) => onChange({ href: e.target.value })} className={INPUT} /></Field>
            <Field label="Description" hint="For screen readers."><input value={slot.alt} maxLength={140} onChange={(e) => onChange({ alt: e.target.value })} className={INPUT} /></Field>
          </div>
        </div>
      )}

      {slot.type !== "filter" && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={slot.sponsored} onChange={(e) => onChange({ sponsored: e.target.checked })} className="h-4 w-4 accent-[var(--color-brand)]" />
          Mark as &ldquo;Sponsored&rdquo;
        </label>
      )}

      {styled && (
        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-xs font-semibold text-ink">Background</p>
          <div className="flex flex-wrap gap-1.5">
            {(["preset", "gradient", "solid", "image"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={slot.bgMode === mode} onClick={() => onChange({ bgMode: mode })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${slot.bgMode === mode ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand"}`}>
                {mode === "preset" ? "Ready-made" : mode === "gradient" ? "Two colours" : mode === "solid" ? "One colour" : "Picture"}
              </button>
            ))}
          </div>

          {(slot.bgMode === "preset" || (slot.bgMode === "image" && !slot.bgImage)) && (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
                <button key={key} type="button" aria-pressed={slot.bgPreset === key} onClick={() => onChange({ bgPreset: key, tone: PRESETS[key].tone })}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${slot.bgPreset === key ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand"}`}>
                  <span className={`h-4 w-4 rounded-full ${PRESETS[key].swatch}`} />
                  {PRESETS[key].label}
                </button>
              ))}
            </div>
          )}
          {(slot.bgMode === "gradient" || slot.bgMode === "solid") && (
            <div className="flex flex-wrap items-center gap-4">
              <ColourInput label={slot.bgMode === "solid" ? "Colour" : "From"} value={slot.bgFrom} onChange={(bgFrom) => onChange({ bgFrom })} />
              {slot.bgMode === "gradient" && <ColourInput label="To" value={slot.bgTo} onChange={(bgTo) => onChange({ bgTo })} />}
            </div>
          )}
          {slot.bgMode === "image" && (
            <ImageUploadField kind="banner" value={slot.bgImage} onChange={(bgImage) => onChange({ bgImage })} fallbackNote="The ready-made background is used until a picture is added." />
          )}

          <div>
            <p className="text-xs font-semibold text-ink">Text colour</p>
            <div className="mt-1.5 flex gap-2">
              {([["light", "White, on a dark background"], ["dark", "Dark, on a light background"]] as const).map(([tone, label]) => (
                <button key={tone} type="button" aria-pressed={slot.tone === tone} onClick={() => onChange({ tone })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${slot.tone === tone ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink">
      {label}
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#7b1a2a"} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-line bg-bg p-0.5" />
      <span className="font-mono font-normal text-ink-soft">{value}</span>
    </label>
  );
}
