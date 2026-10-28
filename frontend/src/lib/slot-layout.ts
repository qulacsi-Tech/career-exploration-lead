import type { ReactNode } from "react";
import type { ListingSlot } from "@/lib/api";

/** The items that apply to one story: those with no story chosen, and those that name it. */
export const slotsForStory = (slots: ListingSlot[], slug: string) => slots.filter((s) => !s.articles?.length || s.articles.includes(slug));

/** The enabled items that go between the listed ones (the default for an older item with no placement). */
export const inlineSlots = (slots: ListingSlot[]) => slots.filter((s) => s.enabled && (s.placement ?? "inline") === "inline");

/** The enabled items for the right-hand column. */
export const sidebarSlots = (slots: ListingSlot[]) => slots.filter((s) => s.enabled && s.placement === "sidebar");

/** The enabled items at one position: "top" and "bottom" of the list, or the "left" column. */
export const slotsAt = (slots: ListingSlot[], placement: "top" | "bottom" | "left") => slots.filter((s) => s.enabled && s.placement === placement);

/**
 * What goes after item `n` (1-based) of a list: every item whose `after` is `n`, or that repeats onto it.
 * An item is never put after the last one, so the list does not end on an advertisement.
 */
export function slotsAfter(slots: ListingSlot[], n: number, count: number): ListingSlot[] {
  if (n >= count) return [];
  return slots.filter((s) => n >= s.after && (n === s.after || (s.every > 0 && (n - s.after) % s.every === 0)));
}

/** The column's own blocks with the sidebar items among them: an item with `after` k goes after the k-th block (0: the top). */
export function withSidebarSlots(blocks: ReactNode[], slots: ListingSlot[], render: (slot: ListingSlot) => ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const put = (index: number, last: boolean) =>
    slots.filter((s) => (last ? s.after >= index : s.after === index)).forEach((s) => out.push(render(s)));
  put(0, false);
  blocks.forEach((block, i) => {
    out.push(block);
    put(i + 1, i + 1 === blocks.length);
  });
  if (blocks.length === 0) slots.filter((s) => s.after > 0).forEach((s) => out.push(render(s)));
  return out;
}
