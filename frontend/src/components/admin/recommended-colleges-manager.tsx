"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRecommendedUniversities } from "@/lib/admin-actions";
import type { LocationPicker } from "@/lib/api";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSection } from "@/components/admin/admin-section";
import { CollegeMultiPicker } from "@/components/admin/college-multi-picker";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The homepage Recommended colleges row (up to six), from the colleges already in the directory.

  A table of the chosen colleges, in the order they show, with Up, Down and Remove. Add
  colleges opens a picker over the whole directory (filter by category, search by name or
  city, tick several). Every change saves at once.
*/

const MAX_ROW = 6;

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function RecommendedCollegesManager({ chosen, picker }: { chosen: string[]; picker: LocationPicker }) {
  const router = useRouter();
  const [row, setRow] = useState<string[]>(chosen);
  const [seen, setSeen] = useState(chosen);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (chosen !== seen) {
    setSeen(chosen);
    setRow(chosen);
  }

  const bySlug = new Map(picker.colleges.map((c) => [c.slug, c]));
  const rows = row.map((s) => bySlug.get(s)).filter((c): c is NonNullable<typeof c> => !!c);
  const room = MAX_ROW - rows.length;

  const persist = (next: string[], success: string) => {
    const previous = row;
    setRow(next);
    clearFlash();
    startTransition(async () => {
      const result = await saveRecommendedUniversities(next);
      if ("error" in result) {
        setRow(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const closeAdd = () => {
    setAdding(false);
    setPicked([]);
  };

  return (
    <AdminSection
      title="Recommended colleges"
      description={`The colleges in the homepage Recommended colleges row, in order (up to ${MAX_ROW}), chosen from the directory.`}
      actions={
        <button type="button" disabled={room <= 0} onClick={() => setAdding(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40">
          Add colleges
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-ink">
          {rows.length} of {MAX_ROW} places used
          {room <= 0 && <span className="ml-2 font-normal text-ink-soft">The row is full. Remove a college to add another.</span>}
        </p>
        <StatusMessage flash={flash} />

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No colleges chosen. The row will not show on the homepage.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="w-12 px-3 py-2.5 font-semibold">#</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">College</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">City</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.slug} className="border-b border-line-soft last:border-b-0">
                    <td className="px-3 py-3 text-xs font-semibold text-ink-soft">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-3 py-3 text-ink-soft">{c.city}</td>
                    <td className="px-3 py-3 text-ink-soft">{c.stream}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0 || pending} onClick={() => persist(move(row, row.indexOf(c.slug), -1), `Moved ${c.name} up. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
                        <button type="button" aria-label={`Move ${c.name} down`} disabled={i === rows.length - 1 || pending} onClick={() => persist(move(row, row.indexOf(c.slug), 1), `Moved ${c.name} down. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
                        <button type="button" disabled={pending} onClick={() => persist(row.filter((s) => s !== c.slug), `${c.name} was taken out of the row.`)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <AdminModal
          open
          onClose={closeAdd}
          size="lg"
          title="Add colleges to the row"
          description={`Pick up to ${room} more. The colleges already in the row are not listed.`}
          footer={
            <div className="ml-auto flex items-center gap-3">
              <button type="button" onClick={closeAdd} className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:border-brand">Cancel</button>
              <button
                type="button"
                disabled={picked.length === 0 || pending}
                onClick={() => {
                  const names = picked.length;
                  const next = [...row, ...picked];
                  closeAdd();
                  persist(next, `${names} college${names === 1 ? "" : "s"} added to the row.`);
                }}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {picked.length > 0 ? `Add ${picked.length} selected` : "Add selected"}
              </button>
            </div>
          }
        >
          <CollegeMultiPicker
            idPrefix="rec-col"
            colleges={picker.colleges.filter((c) => !row.includes(c.slug))}
            streams={picker.streams}
            selected={picked}
            onChange={setPicked}
            max={room}
          />
        </AdminModal>
      )}
    </AdminSection>
  );
}
