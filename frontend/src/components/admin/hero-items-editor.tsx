"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveHeroOrder } from "@/lib/admin-actions";
import type { AdminHeroItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { AdminSection } from "@/components/admin/admin-section";
import { HeroItemModal } from "@/components/admin/hero-item-modal";
import { StatusMessage, useFlash } from "@/components/admin/status-message";

/*
  The homepage hero slides, as a table.

  Each row is one slide. Up and Down set the order and save at once. Everything else,
  including switching a slide on or off and deleting it, is in the form that Add slide
  and Edit open. With one active slide the homepage shows it plain; with several it
  becomes a slider that rotates them in this order.
*/

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function HeroItemsEditor({ items: initial, max }: { items: AdminHeroItem[]; max: number }) {
  const router = useRouter();
  const [items, setItems] = useState<AdminHeroItem[]>(initial);
  const [seen, setSeen] = useState(initial);
  const [flash, showFlash, clearFlash] = useFlash();
  const [pending, startTransition] = useTransition();
  // undefined: closed. null: adding. A slide: editing it.
  const [modal, setModal] = useState<AdminHeroItem | null | undefined>(undefined);

  // The page re-rendered with fresh data (after a save or the form closing).
  if (initial !== seen) {
    setSeen(initial);
    setItems(initial);
  }

  const activeCount = items.filter((i) => i.active).length;
  const full = items.length >= max;

  const shift = (index: number, direction: -1 | 1) => {
    const previous = items;
    const next = move(items, index, direction);
    setItems(next);
    clearFlash();
    startTransition(async () => {
      const result = await saveHeroOrder(next.map((i) => i.id));
      if ("error" in result) {
        setItems(previous);
        showFlash("error", `Not saved: ${result.error}`);
      } else {
        showFlash("ok", `Moved slide ${index + 1} ${direction < 0 ? "up" : "down"}. Order saved.`);
        router.refresh();
      }
    });
  };

  return (
    <AdminSection
      title="Hero slides"
      description="The pictures and words at the top of the homepage. One active slide shows plain; two or more become a slider."
      actions={
        <button
          type="button"
          onClick={() => setModal(null)}
          disabled={full}
          title={full ? `The hero holds up to ${max} slides. Delete one to add another.` : undefined}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Add slide
        </button>
      }
    >
      <div className="space-y-4">
        <StatusMessage flash={flash} />

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            There are no slides, so the homepage hero shows only the search box. Click Add slide to create the first one.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">
                {activeCount} of {items.length}
              </span>{" "}
              slides active
              {activeCount > 1 ? ". The homepage rotates them as a slider." : activeCount === 1 ? ". The homepage shows it as a plain hero." : ". The homepage hero shows only the search box."}
            </p>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th scope="col" className="w-10 py-2 pr-3 font-semibold">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Picture
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Headline
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Sub-headline
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className={`border-b border-line-soft align-middle last:border-b-0 ${item.active ? "" : "opacity-70"}`}>
                      <td className="py-3 pr-3 text-ink-soft">{index + 1}</td>
                      <td className="py-3 pr-3">
                        <span className="relative block h-12 w-24 overflow-hidden rounded-md border border-line bg-brand-ink">
                          {item.image && (
                            // Plain img: uploads come from the API's origin, not the optimizer's allow-list.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaUrl(item.image)} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        {!item.image && <span className="mt-1 block text-[11px] text-ink-faint">Built-in illustration</span>}
                      </td>
                      <td className="max-w-[260px] py-3 pr-3">
                        <p className="line-clamp-2 font-medium text-ink">{item.headline}</p>
                      </td>
                      <td className="max-w-[320px] py-3 pr-3">
                        <p className="line-clamp-2 text-ink-soft">{item.subheadline}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.active ? "bg-green-50 text-green-800" : "bg-bg-alt text-ink-soft"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-green-600" : "bg-ink-faint"}`} />
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" aria-label={`Move slide ${index + 1} up`} disabled={index === 0 || pending} onClick={() => shift(index, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Up
                          </button>
                          <button type="button" aria-label={`Move slide ${index + 1} down`} disabled={index === items.length - 1 || pending} onClick={() => shift(index, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">
                            Down
                          </button>
                          <button type="button" onClick={() => setModal(item)} className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mounted only while open, so every opening starts with a clean form. */}
      {modal !== undefined && (
        <HeroItemModal
          key={modal ? modal.id : "new"}
          item={modal}
          onClose={(message) => {
            setModal(undefined);
            if (message) showFlash("ok", message);
          }}
        />
      )}
    </AdminSection>
  );
}
