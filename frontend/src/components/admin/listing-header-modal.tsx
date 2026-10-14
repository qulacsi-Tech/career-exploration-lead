"use client";

import { useEffect, useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { loadListingHeader, saveListingHeader } from "@/lib/admin-actions";
import type { ListingHeader, ListingPage } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const INPUT = "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/**
 * A button for an admin page's header that opens the dialog for the author and the intro text
 * shown at the top of that page's public listing. Each listing page has its own.
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

  // Load once, when the dialog opens.
  useEffect(() => {
    let alive = true;
    loadListingHeader(page).then((result) => {
      if (!alive) return;
      if ("error" in result) return setError(result.error);
      setValue(result);
    });
    return () => {
      alive = false;
    };
  }, [page]);

  const set = (patch: Partial<ListingHeader>) => {
    setValue((v) => (v ? { ...v, ...patch } : v));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    if (!value) return;
    startTransition(async () => {
      const result = await saveListingHeader(page, value);
      if ("error" in result) return setError(result.error);
      setSaved(true);
    });
  };

  const url = `/${page}`;

  return (
    <AdminModal
      open
      onClose={onClose}
      size="lg"
      title={`${page === "colleges" ? "Colleges" : "Courses"} page header`}
      description={`The author and the introduction at the top of ${url}.`}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          {saved && <span className="mr-auto text-sm text-emerald-700">Saved.</span>}
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

      {value && (
        <div className="space-y-5">
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
