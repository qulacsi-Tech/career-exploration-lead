"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHeroItem, deleteHeroItem, updateHeroItem } from "@/lib/admin-actions";
import type { AdminHeroItem, HeroItemInput } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { ImageUploadField } from "@/components/admin/image-upload-field";

/*
  One hero slide, one form: its headline, sub-headline, picture and whether it is
  active. Add and edit are the same screen.

  Active slides rotate on the homepage in the table's order; an inactive slide is
  kept but not shown, so a seasonal slide can be switched off and back on without
  being rebuilt. The search box under the slides is shared and is edited beside the
  table.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const BLANK: HeroItemInput = { headline: "", subheadline: "", image: "", imageAlt: "", active: true };

function Text({
  id,
  label,
  value,
  onChange,
  min,
  max,
  hint,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max: number;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {min ? <span className="text-brand"> *</span> : null}
      </label>
      {multiline ? (
        <textarea id={id} rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input id={id} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function HeroItemModal({
  item,
  onClose,
}: {
  /** The slide to edit, or null to add a new one. */
  item: AdminHeroItem | null;
  /** `message` is set when something was saved, added or deleted. */
  onClose: (message?: string) => void;
}) {
  const router = useRouter();
  const editing = item;
  const [draft, setDraft] = useState<HeroItemInput>(() =>
    item
      ? { headline: item.headline, subheadline: item.subheadline, image: item.image, imageAlt: item.imageAlt, active: item.active }
      : BLANK
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof HeroItemInput>(key: K, value: HeroItemInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const canSave = draft.headline.trim().length >= 5 && draft.subheadline.trim().length >= 5;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateHeroItem(editing.id, draft) : await createHeroItem(draft);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(editing ? "Slide saved." : "Slide added.");
    });
  };

  const remove = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteHeroItem(editing.id);
      if ("error" in result) {
        setConfirmingDelete(false);
        setError(result.error);
        return;
      }
      router.refresh();
      onClose("Slide deleted.");
    });
  };

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing && (
        <div className="flex items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-ink-soft">Delete this slide? This cannot be undone.</span>
              <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">
              Delete slide
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {!canSave && <span className="text-xs text-amber-800">A headline and a sub-headline of at least 5 characters are needed.</span>}
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending && !confirmingDelete ? "Saving…" : editing ? "Save" : "Add slide"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="lg"
      title={editing ? "Edit hero slide" : "Add hero slide"}
      description="One slide of the homepage hero. Active slides rotate in the order of the table."
      footer={footer}
    >
      <div className="space-y-6">
        <label className="flex max-w-xl cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
          />
          <span className="text-sm text-ink">
            Active
            <span className="mt-0.5 block text-xs text-ink-soft">
              {draft.active ? "Shown on the homepage." : "Kept here but not shown on the homepage."}
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Text id="hero-headline" label="Headline" min={5} max={150} value={draft.headline} onChange={(v) => set("headline", v)} hint="5 to 150 characters." />
          <Text id="hero-sub" label="Sub-headline" min={5} max={300} multiline value={draft.subheadline} onChange={(v) => set("subheadline", v)} hint="5 to 300 characters." />
        </div>

        <ImageUploadField
          kind="hero"
          value={draft.image}
          onChange={(v) => set("image", v)}
          fallbackNote="No image chosen. This slide shows the built-in campus illustration."
        />

        <div className="max-w-xl">
          <Text
            id="hero-alt"
            label="Image description"
            max={150}
            value={draft.imageAlt}
            onChange={(v) => set("imageAlt", v)}
            hint="Read aloud by screen readers. Leave empty if the picture is only decoration."
          />
        </div>
      </div>
    </AdminModal>
  );
}
