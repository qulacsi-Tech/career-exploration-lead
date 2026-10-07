"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeProgram, saveRecommendedPrograms, setProgramActive } from "@/lib/admin-actions";
import type { AdminProgram, ProgramInput } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { AdminSection } from "@/components/admin/admin-section";
import { MAX_ROW, ProgramModal } from "@/components/admin/program-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  Manage programmes: every programme in one table, with what the homepage Recommended row
  does with it.

  Each row can be switched on or off (Active), put in or taken out of the homepage row, moved
  up or down within the row, edited or deleted. Every click saves at once. A programme that is
  inactive stays in the table but is hidden from the site, row or not. The row shows up to six,
  in the order set here. Add programme and Edit open the same dialog.
*/

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const toInput = (p: AdminProgram): ProgramInput => ({
  name: p.name,
  universityName: p.universityName,
  universitySlug: p.universitySlug,
  onlineDuration: p.onlineDuration ?? "",
  onlineFees: p.onlineFees ?? "",
  onlineFeesNote: p.onlineFeesNote ?? "",
  onCampusDuration: p.onCampusDuration ?? "",
  onCampusFees: p.onCampusFees ?? "",
  isActive: p.isActive,
  image: p.image,
});

export function RecommendedProgramsManager({
  programs,
  recommended,
  colleges,
}: {
  programs: AdminProgram[];
  /** The programme slugs in the homepage row, in order. */
  recommended: string[];
  colleges: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [row, setRow] = useState<string[]>(recommended);
  const [list, setList] = useState<AdminProgram[]>(programs);
  const [seen, setSeen] = useState({ programs, recommended });
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  // undefined: closed. null: adding. A programme: editing it.
  const [modal, setModal] = useState<AdminProgram | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // The page re-rendered with fresh data (after a save or the dialog closing).
  if (programs !== seen.programs || recommended !== seen.recommended) {
    setSeen({ programs, recommended });
    setList(programs);
    setRow(recommended);
  }

  const bySlug = new Map(list.map((p) => [p.slug, p]));
  // The row first, in its order, then the rest by name.
  const inRow = row.filter((s) => bySlug.has(s));
  const ordered = [...inRow.map((s) => bySlug.get(s)!), ...list.filter((p) => !inRow.includes(p.slug)).sort((a, b) => a.name.localeCompare(b.name))];
  const q = query.trim().toLowerCase();
  const shown = q ? ordered.filter((p) => `${p.name} ${p.universityName}`.toLowerCase().includes(q)) : ordered;
  const rowFull = inRow.length >= MAX_ROW;
  const liveCount = inRow.filter((s) => bySlug.get(s)?.isActive).length;

  /** Shows the change at once, saves it, and puts the old state back if the save fails. */
  const run = (apply: () => void, undo: () => void, call: () => Promise<{ error: string } | { ok: true }>, success: string) => {
    apply();
    clearFlash();
    startTransition(async () => {
      const result = await call();
      if ("error" in result) {
        undo();
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const changeRow = (next: string[], success: string) => {
    const previous = row;
    run(() => setRow(next), () => setRow(previous), () => saveRecommendedPrograms(next), success);
  };

  const toggleRow = (p: AdminProgram, on: boolean) =>
    changeRow(on ? [...row, p.slug] : row.filter((s) => s !== p.slug), on ? `${p.name} is now in the homepage row.` : `${p.name} was taken out of the homepage row.`);

  const shift = (p: AdminProgram, direction: -1 | 1) => changeRow(move(inRow, inRow.indexOf(p.slug), direction), `Moved ${p.name} ${direction < 0 ? "up" : "down"}. Order saved.`);

  const toggleActive = (p: AdminProgram) => {
    const previous = list;
    const active = !p.isActive;
    run(
      () => setList(list.map((x) => (x.slug === p.slug ? { ...x, isActive: active } : x))),
      () => setList(previous),
      () => setProgramActive(p.slug, toInput(p), active),
      active ? `${p.name} is now active.` : `${p.name} is now inactive and hidden from the site.`
    );
  };

  const remove = (p: AdminProgram) => {
    setConfirming(null);
    const previous = { list, row };
    run(
      () => {
        setList(list.filter((x) => x.slug !== p.slug));
        setRow(row.filter((s) => s !== p.slug));
      },
      () => {
        setList(previous.list);
        setRow(previous.row);
      },
      () => removeProgram(p.slug, row),
      `${p.name} was deleted.`
    );
  };

  return (
    <AdminSection
      title="Manage programmes"
      description={`Every programme, and which of them the homepage Recommended row shows (up to ${MAX_ROW}). Inactive programmes stay here but are hidden from the site.`}
      actions={
        <button type="button" onClick={() => setModal(null)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Add programme
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            {inRow.length} of {MAX_ROW} places used in the homepage row
            <span className="ml-2 font-normal text-ink-soft">
              {liveCount} showing on the site
            </span>
          </p>
          <label className="sr-only" htmlFor="prog-search">Search programmes</label>
          <input
            id="prog-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programme or university"
            className="w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>

        {inRow.length === 0 && (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No programmes are in the row, so the Recommended row will not show on the homepage.
          </p>
        )}
        {inRow.length > 0 && liveCount === 0 && (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Every programme in the row is inactive, so the Recommended row will not show on the homepage.
          </p>
        )}

        <StatusMessage flash={flash} />

        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">No programmes yet. Click Add programme to create the first one.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-alt text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="px-3 py-2.5 font-semibold">On homepage</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Programme</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">University</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Online</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">On campus</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const position = inRow.indexOf(p.slug);
                  const on = position >= 0;
                  return (
                    <tr key={p.slug} className={`border-b border-line-soft last:border-b-0 ${p.isActive ? "" : "bg-bg-alt/60 text-ink-soft"}`}>
                      <td className="px-3 py-3">
                        <label className={`flex items-center gap-2 ${!on && rowFull ? "cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={pending || (!on && rowFull)}
                            onChange={(e) => toggleRow(p, e.target.checked)}
                            aria-label={`Show ${p.name} in the homepage row`}
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                          {on && <span className="text-xs font-semibold text-ink-soft">#{position + 1}</span>}
                        </label>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
                            {p.image && (
                              // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl(p.image)} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-ink">{p.name}</span>
                            <span className="block text-xs text-ink-faint">{p.slug}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{p.universityName}</td>
                      <td className="px-3 py-3">{[p.onlineDuration, p.onlineFees].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-3">{[p.onCampusDuration, p.onCampusFees].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={p.isActive}
                          aria-label={`${p.name} is ${p.isActive ? "active" : "inactive"}. Click to switch.`}
                          disabled={pending}
                          onClick={() => toggleActive(p)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            p.isActive ? "bg-green-50 text-green-800 hover:bg-green-100" : "bg-bg-alt text-ink-soft hover:bg-line-soft"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </button>
                        {on && !p.isActive && <p className="mt-1 text-[11px] text-amber-800">In the row, but hidden</p>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {on && (
                            <>
                              <button type="button" aria-label={`Move ${p.name} up`} disabled={position === 0 || pending} onClick={() => shift(p, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                                Up
                              </button>
                              <button type="button" aria-label={`Move ${p.name} down`} disabled={position === inRow.length - 1 || pending} onClick={() => shift(p, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                                Down
                              </button>
                            </>
                          )}
                          <button type="button" onClick={() => setModal(p)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                            Edit
                          </button>
                          {confirming === p.slug ? (
                            <>
                              <button type="button" disabled={pending} onClick={() => remove(p)} className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                                Yes, delete
                              </button>
                              <button type="button" onClick={() => setConfirming(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-brand">
                                Keep
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={pending} onClick={() => setConfirming(p.slug)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-red-700 hover:text-red-700 disabled:opacity-40">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-soft">
                      No programme matches &ldquo;{query}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mounted only while open, so every opening starts with a clean form. */}
      {modal !== undefined && (
        <ProgramModal
          key={modal ? modal.slug : "new"}
          program={modal}
          rowSlugs={inRow}
          colleges={colleges}
          onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }}
        />
      )}
    </AdminSection>
  );
}
