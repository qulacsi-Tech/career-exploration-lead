"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFieldOrder } from "@/lib/admin-actions";
import type { AdminField } from "@/lib/api";
import { fieldIcon } from "@/lib/field-icons";
import { AdminSection } from "@/components/admin/admin-section";
import { FieldModal } from "@/components/admin/field-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The discs in the homepage Fields grid, one row each.

  The tick shows or hides a field and Up/Down set the order. Both save the moment
  you click. Everything else about a field, and adding or deleting one, is in the
  form that Add field and Edit open.
*/

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function HomeFieldsEditor({ fields: initial }: { fields: AdminField[] }) {
  const router = useRouter();
  const [list, setList] = useState<AdminField[]>(initial);
  const [seen, setSeen] = useState(initial);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  // undefined: closed. null: adding. A field: editing it.
  const [modal, setModal] = useState<AdminField | null | undefined>(undefined);

  // The page re-rendered with fresh data (after a save or the form closing).
  if (initial !== seen) {
    setSeen(initial);
    setList(initial);
  }

  /** Shows the change at once, saves it, and puts the old list back if the save fails. */
  const persist = (next: AdminField[], success: string) => {
    const previous = list;
    setList(next);
    clearFlash();
    startTransition(async () => {
      const result = await saveFieldOrder(next.map((f) => ({ slug: f.slug, show: f.show })));
      if ("error" in result) {
        setList(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const shown = list.filter((f) => f.show).length;

  return (
    <AdminSection
      title="Fields of study"
      description="The discs in the homepage grid. Tick a field to show it, and use Up and Down to set the order."
      actions={
        <button
          type="button"
          onClick={() => setModal(null)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Add field
        </button>
      }
    >
      <div className="space-y-4">
        {list.length === 0 && <StatusMessage flash={flash} />}
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            There are no fields yet. Click Add field to create the first disc.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">
              {shown} of {list.length} shown on the homepage
            </p>

            {shown === 0 && (
              <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No fields are ticked. The grid will not show on the homepage.
              </p>
            )}

            <StatusMessage flash={flash} />

            <ul className="space-y-2">
              {list.map((field, i) => {
                const Icon = fieldIcon(field.icon);
                return (
                  <li key={field.slug} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 ${field.show ? "" : "opacity-75"}`}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={field.show}
                        disabled={pending}
                        onChange={(e) =>
                          persist(
                            list.map((f) => (f.slug === field.slug ? { ...f, show: e.target.checked } : f)),
                            e.target.checked ? `${field.name} is now shown on the homepage.` : `${field.name} is now hidden from the homepage.`
                          )
                        }
                        className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{field.name}</span>
                        <span className="block truncate text-xs text-ink-soft">
                          {field.avgCtc || "No CTC"}
                          {field.tagline ? ` · ${field.tagline}` : ""}
                        </span>
                      </span>
                    </label>

                    {field.collegeCount === 0 && (
                      <span
                        className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
                        title={`No colleges carry the stream "${field.name}", so /${field.slug}/colleges shows not found.`}
                      >
                        No colleges yet
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button type="button" aria-label={`Move ${field.name} up`} disabled={i === 0 || pending} onClick={() => persist(move(list, i, -1), `Moved ${field.name} up. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                        Up
                      </button>
                      <button type="button" aria-label={`Move ${field.name} down`} disabled={i === list.length - 1 || pending} onClick={() => persist(move(list, i, 1), `Moved ${field.name} down. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                        Down
                      </button>
                      <button type="button" onClick={() => setModal(field)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                        Edit
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

          </>
        )}
      </div>

      {/* Mounted only while open, so every opening starts with a clean form. */}
      {modal !== undefined && (
        <FieldModal key={modal ? modal.slug : "new"} field={modal} onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }} />
      )}
    </AdminSection>
  );
}
