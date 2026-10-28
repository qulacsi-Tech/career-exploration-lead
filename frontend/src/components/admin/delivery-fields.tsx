"use client";

import type { Delivery } from "@/lib/api";

/*
  How a category, course or specialisation is taught: offline, online or both. Posted as `delivery`.
  On an edit form the children underneath (the courses of a category, the specialisations of a course)
  each get their own choice, posted as `child:<slug>`, so the editor can say which of them have an
  online option without leaving the parent.
*/

export const DELIVERY_LABEL: Record<Delivery, string> = { offline: "Offline", online: "Online", both: "Both" };

const OPTIONS: Delivery[] = ["offline", "online", "both"];

export function DeliveryField({ defaultValue = "offline", className }: { defaultValue?: Delivery; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="block text-xs font-semibold text-ink">Availability</legend>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <li key={option}>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
              <input type="radio" name="delivery" value={option} defaultChecked={defaultValue === option} className="h-4 w-4 accent-[var(--color-brand)]" />
              {DELIVERY_LABEL[option]}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-ink-faint">Online or Both lets a college offer it online, with its own duration and fees, on the college form.</p>
    </fieldset>
  );
}

/** One choice for each child of the record being edited. */
export function ChildDelivery({ label, items, emptyNote, className }: { label: string; items: { slug: string; name: string; delivery: Delivery }[]; emptyNote: string; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="block text-xs font-semibold text-ink">{label}</legend>
      {items.length === 0 ? (
        <p className="mt-1.5 text-sm text-ink-soft">{emptyNote}</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-line-soft rounded-lg border border-line">
          {items.map((item) => (
            <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-sm text-ink">{item.name}</span>
              <select
                name={`child:${item.slug}`}
                aria-label={`${item.name}: availability`}
                defaultValue={item.delivery}
                className="shrink-0 rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
              >
                {OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {DELIVERY_LABEL[option]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
