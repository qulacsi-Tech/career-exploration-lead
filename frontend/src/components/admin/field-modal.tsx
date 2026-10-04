"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createField, deleteField, updateField } from "@/lib/admin-actions";
import type { AdminField, FieldInput } from "@/lib/api";
import { FIELD_ICONS, FieldIcon } from "@/lib/field-icons";
import { AdminModal } from "@/components/admin/admin-modal";

/*
  One field of study, one form: its name, its icon, the average CTC shown under
  the disc, the tagline and badge on the disc's back, and whether it shows.

  The page address comes from the name once, when the field is created
  (Computer Science becomes /computer-science/colleges), and stays the same after
  a rename so links keep working. The disc leads to that address, which lists the
  colleges carrying a stream with the same name, so a field with no colleges yet
  would link to a "not found" page. The form says so up front.
*/

const input =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

const BLANK: FieldInput = { name: "", icon: "book-open", tagline: "", badge: "", avgCtc: "", show: true };

/** The same rule the stream pages use: lowercase, spaces to hyphens. */
const slugOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

function Text({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <input id={id} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
      <p className="mt-1 text-xs text-ink-faint">
        {hint ? `${hint} ` : ""}
        {value.length}/{max}
      </p>
    </div>
  );
}

export function FieldModal({ field, onClose }: { field: AdminField | null; onClose: (message?: string) => void }) {
  const router = useRouter();
  const editing = field;
  const [draft, setDraft] = useState<FieldInput>(() =>
    field
      ? { name: field.name, icon: field.icon, tagline: field.tagline, badge: field.badge, avgCtc: field.avgCtc, show: field.show }
      : BLANK
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FieldInput>(key: K, value: FieldInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const nameOk = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(draft.name.trim()) && draft.name.trim().length >= 2;
  const slug = editing ? editing.slug : slugOf(draft.name);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateField(editing.slug, draft) : await createField(draft);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(editing ? `${draft.name.trim()} saved.` : `${draft.name.trim()} added to the fields list.`);
    });
  };

  const remove = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteField(editing.slug);
      if ("error" in result) {
        setConfirmingDelete(false);
        setError(result.error);
        return;
      }
      router.refresh();
      onClose(`${editing.name} deleted.`);
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
              <span className="text-xs text-ink-soft">Delete {editing.name}? It leaves the homepage.</span>
              <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">
              Delete field
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <button type="button" onClick={() => onClose()} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!nameOk || pending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
          {pending && !confirmingDelete ? "Saving…" : editing ? "Save" : "Add field"}
        </button>
      </div>
    </div>
  );

  return (
    <AdminModal
      open
      onClose={() => onClose()}
      size="lg"
      title={editing ? `Edit ${editing.name}` : "Add field"}
      description="A disc in the homepage Fields grid."
      footer={footer}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Text
              id="field-name"
              label="Name"
              required
              max={80}
              value={draft.name}
              onChange={(v) => set("name", v)}
              hint="Letters, numbers and spaces."
            />
            {draft.name.trim() !== "" && !nameOk && (
              <p role="alert" className="-mt-1 text-xs text-red-700">
                Use letters, numbers and single spaces only. The name becomes the page address.
              </p>
            )}
            <p className="mt-2 text-xs text-ink-soft">
              {editing ? "Links to" : "Will link to"} <span className="font-mono">/{slug || "…"}/colleges</span>
              {editing
                ? editing.collegeCount > 0
                  ? ` (${editing.collegeCount} colleges).`
                  : ". No colleges carry this stream yet, so that page shows “not found”."
                : ". The page lists colleges whose stream has the same name, so add some first or it shows “not found”."}
            </p>
          </div>

          <Text
            id="field-ctc"
            label="Average CTC"
            max={40}
            value={draft.avgCtc}
            onChange={(v) => set("avgCtc", v)}
            hint="Shown under the disc, e.g. ₹9 - 32 LPA."
          />
          <Text
            id="field-tagline"
            label="Tagline"
            max={120}
            value={draft.tagline}
            onChange={(v) => set("tagline", v)}
            hint="On the back of the disc when someone points at it."
          />
          <Text
            id="field-badge"
            label="Badge"
            max={60}
            value={draft.badge}
            onChange={(v) => set("badge", v)}
            hint="The small line above the tagline, e.g. Highest Demand."
          />
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-ink">Icon</legend>
          <div role="radiogroup" aria-label="Icon" className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
            {FIELD_ICONS.map(({ key, label, Icon: Choice }) => {
              const on = draft.icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={label}
                  title={label}
                  onClick={() => set("icon", key)}
                  className={`flex h-12 items-center justify-center rounded-lg border transition ${
                    on ? "border-brand bg-brand-soft text-brand ring-2 ring-brand/30" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  <Choice className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <p className="text-xs font-semibold text-ink">Preview</p>
          <div className="mt-2 flex w-40 flex-col items-center rounded-xl border border-line bg-bg-alt px-3 py-4">
            <span className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border border-line bg-surface px-2 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <FieldIcon name={draft.icon} className="h-4 w-4" />
              </span>
              <span className="font-display text-[11px] font-medium leading-tight text-ink">{draft.name.trim() || "Name"}</span>
            </span>
            <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.12em] text-ink-soft">Avg CTC</span>
            <span className="text-[11px] font-medium text-ink-soft">{draft.avgCtc.trim() || "—"}</span>
          </div>
        </div>

        <label className="flex max-w-xl cursor-pointer items-center gap-3 rounded-lg border border-line bg-bg-alt px-4 py-3">
          <input
            type="checkbox"
            checked={draft.show}
            onChange={(e) => set("show", e.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
          />
          <span className="text-sm text-ink">Show this field on the homepage</span>
        </label>
      </div>
    </AdminModal>
  );
}
