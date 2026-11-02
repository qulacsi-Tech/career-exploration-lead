"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ImageUp, Plus, Search, X } from "lucide-react";
import { createRecruiter, loadRecruiters, updateRecruiter } from "@/lib/admin-actions";
import type { AdminRecruiter, RecruiterDisplay } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RecruiterChip } from "@/components/college/recruiter-chip";

/*
  Top recruiters for one placement year, chosen from one shared pool of companies. Search the pool and click a
  company to add it; if it is not there, add it as a new company (a name already in the pool, whatever its case,
  is the same company and is not added twice). Each company can have a logo, kept once in the pool and shown
  wherever any college lists it. A company with a logo shows the logo alone by default, or its name, or both, as
  chosen on the logo dialog; one without a logo shows its name. A preview underneath shows the strip as the college page will draw it.
*/

const keyOf = (name: string) => name.split(/\s+/).filter(Boolean).join(" ").toLowerCase();

// The pool is the same for every placement year and every opening of the editor, so it is read once.
let cache: AdminRecruiter[] | null = null;

export function RecruiterPicker({ id, label, value, onChange, max = 30 }: { id: string; label: string; value: string[]; onChange: (names: string[]) => void; max?: number }) {
  const [pool, setPool] = useState<AdminRecruiter[] | null>(cache);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminRecruiter | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadRecruiters().then((result) => {
      if (!alive) return;
      if ("error" in result) return setError(result.error);
      cache = result;
      setPool(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  const remember = (next: AdminRecruiter[]) => {
    cache = next;
    setPool(next);
  };

  const byKey = useMemo(() => new Map((pool ?? []).map((r) => [keyOf(r.name), r])), [pool]);
  const picked = useMemo(() => new Set(value.map(keyOf)), [value]);
  const q = keyOf(query);
  const matches = (pool ?? []).filter((r) => !picked.has(keyOf(r.name)) && (!q || keyOf(r.name).includes(q))).slice(0, 8);
  const exact = q ? byKey.get(q) : undefined;
  const full = value.length >= max;

  const add = (name: string) => {
    if (full || picked.has(keyOf(name))) return;
    onChange([...value, name]);
    setQuery("");
    setError(null);
  };

  /** A name not in the pool: add it there first (the server returns the existing company if the name was taken), then to the list. */
  const addNew = async () => {
    const name = query.trim().replace(/\s+/g, " ");
    if (!name || full) return;
    setBusy(true);
    setError(null);
    const result = await createRecruiter(name);
    setBusy(false);
    if ("error" in result) return setError(result.error);
    if (!byKey.has(keyOf(result.name))) remember([...(pool ?? []), result].sort((a, b) => a.name.localeCompare(b.name)));
    add(result.name);
  };

  // Click outside closes the list.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // The little menu on a company's logo: which company it is open for, and a save in flight.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [savingDisplay, setSavingDisplay] = useState(false);

  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-display-menu]")) setMenuFor(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuFor]);

  /** Saves at once to the shared pool, like the logo dialog does, so it applies to every college that lists the company. */
  const chooseDisplay = async (company: AdminRecruiter, display: RecruiterDisplay) => {
    setSavingDisplay(true);
    setError(null);
    const result = await updateRecruiter(company.id, { display });
    setSavingDisplay(false);
    if ("error" in result) return setError(result.error);
    remember((pool ?? []).map((r) => (r.id === result.id ? result : r)));
    setMenuFor(null);
  };

  const shown = value.map((name) => byKey.get(keyOf(name)) ?? { id: "", name, logo: "", display: "logo" as const });

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label} <span className="font-normal text-ink-faint">({value.length} of {max})</span>
      </label>

      {shown.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {shown.map((r) => (
            <li key={r.name} data-display-menu className="relative flex items-center gap-1.5 rounded-full border border-line bg-bg-alt py-1 pl-3 pr-1.5 text-sm text-ink">
              {r.logo && r.id ? (
                /* Click the logo to choose what the college page shows: the logo, the name or both. */
                <button type="button" onClick={() => setMenuFor(menuFor === r.id ? null : r.id)} aria-haspopup="menu" aria-expanded={menuFor === r.id} title="Choose what the college page shows" className="flex items-center gap-0.5 rounded-md px-0.5 transition hover:bg-brand-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(r.logo)} alt={`${r.name} logo`} className="h-5 w-auto max-w-[3.5rem] object-contain" />
                  <ChevronDown className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                </button>
              ) : (
                r.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(r.logo)} alt="" className="h-5 w-auto max-w-[3.5rem] object-contain" />
                )
              )}
              <span>{r.name}</span>
              {menuFor === r.id && (
                <div role="menu" className="absolute left-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-line bg-surface p-1 shadow-lg">
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-ink-faint">Show on the college page</p>
                  {DISPLAYS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={r.display === option.value}
                      disabled={savingDisplay}
                      onClick={() => void chooseDisplay(r, option.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-bg-alt disabled:opacity-60 ${r.display === option.value ? "font-semibold text-brand-ink" : "text-ink-soft"}`}
                    >
                      {option.label}
                      {r.display === option.value && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
              {r.id && (
                <button type="button" onClick={() => setEditing(r)} aria-label={`${r.logo ? "Change" : "Add"} the logo of ${r.name}`} title={r.logo ? "Change logo" : "Add a logo"} className={`grid h-6 w-6 place-items-center rounded-full transition hover:bg-brand-soft hover:text-brand ${r.logo ? "text-ink-faint" : "text-brand"}`}>
                  <ImageUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={() => onChange(value.filter((n) => keyOf(n) !== keyOf(r.name)))} aria-label={`Remove ${r.name}`} className="grid h-6 w-6 place-items-center rounded-full text-ink-faint transition hover:bg-red-50 hover:text-red-600">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Search the pool, add a new company if it is not there. */}
      <div ref={box} className="relative mt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            id={id}
            value={query}
            disabled={full}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (matches[0] && (exact ? keyOf(matches[0].name) === q : true)) add(matches[0].name);
              else if (q && !exact) void addNew();
            }}
            placeholder={full ? `Up to ${max} companies` : pool ? `Search ${pool.length} companies, or type a new one` : "Loading the companies…"}
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none disabled:opacity-60"
          />
        </div>

        {focused && !full && pool && (matches.length > 0 || (q && !exact)) && (
          <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-lg">
            {matches.map((r) => (
              <li key={r.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => add(r.name)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition hover:bg-bg-alt">
                  {r.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(r.logo)} alt="" className="h-5 w-8 object-contain" />
                  ) : (
                    <span className="h-5 w-8" aria-hidden />
                  )}
                  {r.name}
                </button>
              </li>
            ))}
            {q && !exact && (
              <li role="option" aria-selected={false} className="border-t border-line-soft">
                <button type="button" disabled={busy} onClick={() => void addNew()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-50">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {busy ? "Adding…" : `Add “${query.trim()}” as a new company`}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}
      <p className="mt-1.5 text-xs text-ink-faint">Companies are shared by every college. Use the picture button on a company to add its logo once, for all of them. Click a company&apos;s logo to show the logo, the name or both on the college page.</p>

      {/* How the strip will look on the college page. */}
      {shown.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-bg-alt p-3">
          <p className="mb-2 text-[11px] font-semibold text-ink-faint">Preview: Top Recruiters on the college page</p>
          <ul className="flex flex-wrap gap-2">
            {shown.map((r) => (
              <li key={r.name} className="flex min-h-[3.75rem] items-center whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink shadow-sm">
                <RecruiterChip name={r.name} logo={r.logo} display={r.display} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <LogoDialog
          company={editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            remember((pool ?? []).map((r) => (r.id === row.id ? row : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const DISPLAYS: { value: RecruiterDisplay; label: string }[] = [
  { value: "logo", label: "Logo only" },
  { value: "name", label: "Name only" },
  { value: "both", label: "Logo and name" },
];

/** A company's logo, and whether the logo, the name or both are shown. Saved at once to the shared pool. */
function LogoDialog({ company, onClose, onSaved }: { company: AdminRecruiter; onClose: () => void; onSaved: (row: AdminRecruiter) => void }) {
  const [logo, setLogo] = useState(company.logo);
  const [display, setDisplay] = useState<RecruiterDisplay>(company.display);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updateRecruiter(company.id, { logo, display });
    setSaving(false);
    if ("error" in result) return setError(result.error);
    onSaved(result);
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={`${company.name}: logo`}
      description="Kept once for the company and shown on every college that lists it."
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          {logo && (
            <button type="button" onClick={() => setLogo("")} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
              Remove the logo
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {saving ? "Saving…" : "Save logo"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        <div>
          <p className="text-xs font-semibold text-ink">Logo</p>
          <ImageUploadField kind="recruiter_logo" value={logo} onChange={setLogo} fallbackNote="No logo: the company's name is shown." />
        </div>
        {logo && (
          <fieldset>
            <legend className="text-xs font-semibold text-ink">Show on the college page</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DISPLAYS.map((option) => (
                <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${display === option.value ? "border-brand bg-brand-soft font-semibold text-brand-ink" : "border-line text-ink-soft hover:border-brand"}`}>
                  <input type="radio" name="recruiter-display" checked={display === option.value} onChange={() => setDisplay(option.value)} className="h-4 w-4 accent-[var(--color-brand)]" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="rounded-xl border border-line bg-bg-alt p-4">
          <p className="mb-2 text-[11px] font-semibold text-ink-faint">Preview</p>
          <span className="inline-block whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-sm">
            <RecruiterChip name={company.name} logo={logo} display={display} />
          </span>
        </div>
      </div>
    </AdminModal>
  );
}
