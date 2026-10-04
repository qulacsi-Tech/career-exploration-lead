"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHomeLocations } from "@/lib/admin-actions";
import type { AdminHomeLocation, AdminLocationLabel, IndiaGeo } from "@/lib/api";
import type { LocationCardCopy } from "@/lib/home-copy";
import { mediaUrl } from "@/lib/media";
import { AdminSection } from "@/components/admin/admin-section";
import { LocationModal } from "@/components/admin/location-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The homepage carousel's cards, one row each.

  The tick shows or hides a card and Up/Down set the order. Both save the moment
  you click, so there is no separate Save step. Everything else about a card, and
  adding or deleting one, is in the form that Add location and Edit open.
*/

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function HomeLocationsEditor({
  locations: initial,
  geo,
  labelPool,
  wording,
}: {
  locations: AdminHomeLocation[];
  geo: IndiaGeo;
  labelPool: AdminLocationLabel[];
  wording: LocationCardCopy;
}) {
  const router = useRouter();
  const [list, setList] = useState<AdminHomeLocation[]>(initial);
  const [seen, setSeen] = useState(initial);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  // undefined: closed. null: adding. A location: editing it.
  const [modal, setModal] = useState<AdminHomeLocation | null | undefined>(undefined);

  // The page re-rendered with fresh data (after a save or the form closing).
  if (initial !== seen) {
    setSeen(initial);
    setList(initial);
  }

  /** Shows the change at once, saves it, and puts the old list back if the save fails. */
  const persist = (next: AdminHomeLocation[], success: string) => {
    const previous = list;
    setList(next);
    clearFlash();
    startTransition(async () => {
      const result = await saveHomeLocations(next.map((l) => ({ slug: l.slug, show: l.show })));
      if ("error" in result) {
        setList(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", success);
        router.refresh();
      }
    });
  };

  const shown = list.filter((l) => l.show).length;

  return (
    <AdminSection
      title="Destination cards"
      description="The cards in the homepage carousel. Tick a card to show it, and use Up and Down to set the order."
      actions={
        <button
          type="button"
          onClick={() => setModal(null)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Add location
        </button>
      }
    >
      <div className="space-y-4">
        {list.length === 0 && <StatusMessage flash={flash} />}
        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            There are no locations yet. Click Add location to create the first card.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">
              {shown} of {list.length} shown on the homepage
            </p>

            {shown === 0 && (
              <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No cards are ticked. The carousel will not show on the homepage.
              </p>
            )}

            <StatusMessage flash={flash} />

            <ul className="space-y-2">
              {list.map((loc, i) => (
                <li key={loc.slug} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 ${loc.show ? "" : "opacity-75"}`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={loc.show}
                      disabled={pending}
                      onChange={(e) =>
                        persist(
                          list.map((l) => (l.slug === loc.slug ? { ...l, show: e.target.checked } : l)),
                          e.target.checked ? `${loc.name} is now shown on the homepage.` : `${loc.name} is now hidden from the homepage.`
                        )
                      }
                      className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                    />
                    <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-bg-alt">
                      {loc.image && (
                        // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(loc.image)} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{loc.name}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {loc.district ? `${loc.district}, ` : ""}
                        {loc.state} · {loc.collegeCount}+ institutions
                        {loc.labels.length > 0 ? ` · ${loc.labels.join(", ")}` : ""}
                      </span>
                    </span>
                  </label>

                  {loc.show && !loc.image && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">No photo</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Move ${loc.name} up`} disabled={i === 0 || pending} onClick={() => persist(move(list, i, -1), `Moved ${loc.name} up. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                      Up
                    </button>
                    <button type="button" aria-label={`Move ${loc.name} down`} disabled={i === list.length - 1 || pending} onClick={() => persist(move(list, i, 1), `Moved ${loc.name} down. Order saved.`)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                      Down
                    </button>
                    <button type="button" onClick={() => setModal(loc)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>

          </>
        )}
      </div>

      {/* Mounted only while open, so every opening starts with a clean form. */}
      {modal !== undefined && (
        <LocationModal
          key={modal ? modal.slug : "new"}
          location={modal}
          geo={geo}
          labelPool={labelPool}
          wording={wording}
          onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }}
        />
      )}
    </AdminSection>
  );
}
