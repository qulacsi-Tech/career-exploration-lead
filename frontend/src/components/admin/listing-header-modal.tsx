"use client";

import { useEffect, useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { loadHeaderTargets, loadListingHeader, resetListingHeader, saveListingHeader } from "@/lib/admin-actions";
import type { ListingHeader, ListingPage } from "@/lib/api";
import type { MenuGroup } from "@/components/colleges-menu";
import { scopeOfHref } from "@/lib/listing-scope";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const SELECT = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const INPUT = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/**
 * A button for an admin page's header that opens the dialog for the heading, author and intro text
 * shown at the top of that page's public listing. Each listing page has its own, and the colleges
 * page can also have one per selection in its menu (a course, a city, a ranking list...), shown
 * when a visitor picks that selection. A selection without its own shows the page's.
 */
export function ListingHeaderButton({ page, label }: { page: ListingPage; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
      >
        <UserRound className="h-4 w-4" />
        {label}
      </button>
      {open && <HeaderDialog page={page} onClose={() => setOpen(false)} />}
    </>
  );
}

function HeaderDialog({ page, onClose }: { page: ListingPage; onClose: () => void }) {
  const [value, setValue] = useState<ListingHeader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // What the dialog can edit: the page itself, or (colleges only) one selection of the menu.
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [custom, setCustom] = useState<Set<string>>(new Set());
  const [groupLabel, setGroupLabel] = useState("");
  const [scope, setScope] = useState("");
  const [hasOwn, setHasOwn] = useState(true);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (page !== "colleges") return;
    let alive = true;
    loadHeaderTargets(page).then((result) => {
      if (!alive) return;
      if (result.error !== undefined) return setError(result.error);
      setGroups(result.groups);
      setCustom(new Set(result.custom));
    });
    return () => {
      alive = false;
    };
  }, [page]);

  // Load the header for what is selected: when the dialog opens, when the selection changes, after a reset.
  useEffect(() => {
    let alive = true;
    setValue(null);
    setSaved(false);
    loadListingHeader(page, scope || undefined).then((result) => {
      if (!alive) return;
      if ("error" in result) return setError(result.error);
      const { custom: own, ...fields } = result;
      setValue(fields);
      setHasOwn(own);
    });
    return () => {
      alive = false;
    };
  }, [page, scope, reloads]);

  const set = (patch: Partial<ListingHeader>) => {
    setValue((v) => (v ? { ...v, ...patch } : v));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    if (!value) return;
    startTransition(async () => {
      const result = await saveListingHeader(page, value, scope || undefined);
      if ("error" in result) return setError(result.error);
      setSaved(true);
      setHasOwn(true);
      if (scope) setCustom((c) => new Set(c).add(scope));
    });
  };

  const reset = () => {
    startTransition(async () => {
      const result = await resetListingHeader(page, scope);
      if ("error" in result) return setError(result.error);
      setCustom((c) => {
        const next = new Set(c);
        next.delete(scope);
        return next;
      });
      setReloads((n) => n + 1);
    });
  };

  const group = groups.find((g) => g.label === groupLabel);
  const url = scope ? `/${page}?${scope}` : `/${page}`;

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={page === "colleges" ? "Header management" : "Courses page header"}
      description={`The heading, author and introduction at the top of ${url}.`}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          {saved && <span className="mr-auto text-sm text-emerald-700">Saved.</span>}
          {!saved && scope && hasOwn && (
            <button type="button" onClick={reset} disabled={pending} className="mr-auto text-sm text-ink-soft underline hover:text-brand">
              Reset to the page&rsquo;s header
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">
            {saved ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!value || pending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
      {!value && !error && <p className="text-sm text-ink-soft">Loading…</p>}

      {page === "colleges" && (
        <div className="mb-5 rounded-xl border border-line bg-bg-alt p-4">
          <p className="text-xs font-semibold text-ink">This header shows when a visitor opens</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Menu section"
              value={groupLabel}
              onChange={(e) => {
                setGroupLabel(e.target.value);
                setScope("");
              }}
              className={SELECT}
            >
              <option value="">All colleges (the page&rsquo;s own header)</option>
              {groups.map((g) => (
                <option key={g.label} value={g.label}>
                  {g.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Menu selection"
              value={scope}
              disabled={!group}
              onChange={(e) => setScope(e.target.value)}
              className={`${SELECT} disabled:opacity-50`}
            >
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
                ? "This selection has its own header. Saving changes it."
                : "This selection shows the page's header. Saving gives it one of its own."
              : "Used for the page and for every selection without its own header."}{" "}
            A &ldquo;●&rdquo; marks selections that already have their own.
          </p>
        </div>
      )}

      {value && (
        <div className="space-y-5">
          <div>
            <label htmlFor="lh-title" className="block text-xs font-semibold text-ink">Heading</label>
            <input id="lh-title" value={value.title} maxLength={120} placeholder="Written from the filters, e.g. MBA Colleges in Pune" onChange={(e) => set({ title: e.target.value })} className={INPUT} />
            <p className="mt-1 text-xs text-ink-faint">Leave empty to use the automatic heading.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lh-name" className="block text-xs font-semibold text-ink">Author name</label>
              <input id="lh-name" value={value.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} className={INPUT} />
              <p className="mt-1 text-xs text-ink-faint">Leave empty to hide the author.</p>
            </div>
            <div>
              <label htmlFor="lh-role" className="block text-xs font-semibold text-ink">Author role</label>
              <input id="lh-role" value={value.role} maxLength={80} placeholder="Assistant Manager" onChange={(e) => set({ role: e.target.value })} className={INPUT} />
            </div>
            <div className="sm:col-span-2 sm:max-w-xs">
              <p className="text-xs font-semibold text-ink">Author photo</p>
              <ImageUploadField kind="logo" value={value.photo} onChange={(photo) => set({ photo })} fallbackNote="A circle with the author's initial." />
            </div>
          </div>

          <div>
            <label htmlFor="lh-intro" className="block text-xs font-semibold text-ink">Introduction</label>
            <textarea
              id="lh-intro"
              rows={9}
              maxLength={4000}
              value={value.intro}
              onChange={(e) => set({ intro: e.target.value })}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-ink-faint">
              Shown under the heading. The first paragraph is always visible; the rest sit behind &ldquo;Read More&rdquo;. Separate paragraphs with a blank line. Leave empty to show a short guide the page writes from its own data.
            </p>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
