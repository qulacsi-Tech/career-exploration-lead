"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import type { College } from "@/lib/mock-data";
import { compareRows, compareUrl, MAX_COMPARE } from "@/lib/comparison-data";
import { useCompare } from "@/components/compare-tray";
import { Chip } from "@/components/ui/chip";
import { Plus, X } from "lucide-react";

/** What the empty slot's picker needs — not a whole College per option. */
export type CollegeOption = {
  slug: string;
  name: string;
  city: string;
  state: string;
};

/**
 * The comparison board: three slots, always.
 *
 * The table used to render exactly as many columns as the URL named, so a
 * two-college comparison gave no hint that a third could be added and no way to
 * drop one without going back to a listing. Every slot up to `MAX_COMPARE` is
 * now drawn: filled ones carry their data and a remove control, and the spare
 * one is an empty frame with a picker in it.
 *
 * ## The URL stays the source of truth
 *
 * Adding or removing does not mutate local state — it navigates to the
 * comparison URL for the new set. That keeps one comparison at one address
 * (shareable, indexable, and the reason these pages exist at all), and means
 * the server does the resolving exactly as it does on first load. The compare
 * tray is set to match in the same action, so the bar at the foot of the screen
 * never disagrees with the table above it.
 *
 * Dropping to a single college is not a comparison, so that case routes to the
 * compare hub rather than to a one-column page.
 */
export function ComparisonBoard({
  colleges,
  options,
}: {
  colleges: College[];
  options: CollegeOption[];
}) {
  const router = useRouter();
  const { set } = useCompare();
  const [pending, startTransition] = useTransition();

  const slots: (College | null)[] = Array.from(
    { length: MAX_COMPARE },
    (_, i) => colleges[i] ?? null
  );

  const goTo = (next: string[]) => {
    set(next);
    startTransition(() => {
      router.push(next.length >= 2 ? compareUrl(next) : "/compare");
    });
  };

  const addCollege = (slug: string) => goTo([...colleges.map((c) => c.slug), slug]);
  const removeCollege = (slug: string) =>
    goTo(colleges.filter((c) => c.slug !== slug).map((c) => c.slug));

  // Colleges not already on the board, for the empty slot's picker.
  const available = options.filter((o) => !colleges.some((c) => c.slug === o.slug));

  return (
    <div
      className={`-mx-4 overflow-x-auto px-4 transition-opacity sm:mx-0 sm:px-0 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <caption className="sr-only">
          {colleges.map((c) => c.name).join(" versus ")} compared on fees, placements, ranking,
          cutoffs and approvals. Up to {MAX_COMPARE} colleges can be compared at once.
        </caption>

        <thead>
          <tr>
            <th scope="col" className="w-40 border-b border-line py-3 pr-4 text-left align-bottom">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Attribute
              </span>
            </th>

            {slots.map((college, index) =>
              college ? (
                <th
                  key={college.slug}
                  scope="col"
                  className="w-1/4 border-b border-line px-4 py-3 text-left align-bottom"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/college/${college.slug}`}
                        className="font-display text-base font-bold text-ink hover:text-brand"
                      >
                        {college.name}
                      </Link>
                      <span className="mt-1 block text-xs font-normal text-ink-faint">
                        {college.city}, {college.state}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCollege(college.slug)}
                      aria-label={`Remove ${college.name} from the comparison`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition hover:border-brand hover:bg-brand hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ) : (
                <th
                  key={`empty-${index}`}
                  scope="col"
                  className="w-1/4 border-b border-line px-4 py-3 align-bottom"
                >
                  <EmptySlot options={available} onPick={addCollege} />
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {compareRows.map((row) => {
            // `better` indexes into the filled colleges, so resolve it to a
            // slug before painting: slot position and college position differ
            // as soon as a slot is empty.
            const winnerIndex = row.better ? row.better(colleges) : null;
            const winnerSlug =
              winnerIndex !== null && winnerIndex >= 0 ? colleges[winnerIndex]?.slug : null;

            return (
              <tr key={row.key} className="border-b border-line-soft last:border-b-0">
                <th
                  scope="row"
                  className="py-3 pr-4 text-left align-top text-xs font-semibold text-ink-soft"
                >
                  {row.label}
                </th>

                {slots.map((college, index) =>
                  college ? (
                    <td
                      key={college.slug}
                      className={`px-4 py-3 align-top text-sm ${
                        winnerSlug === college.slug ? "bg-brand-soft/50 text-ink" : "text-ink-soft"
                      }`}
                    >
                      {row.value(college)}
                      {winnerSlug === college.slug && (
                        <span className="mt-1 block">
                          <Chip tone="brand">Best</Chip>
                        </span>
                      )}
                    </td>
                  ) : (
                    <td
                      key={`empty-${index}`}
                      className="px-4 py-3 align-top text-sm text-ink-faint"
                      aria-label="No college selected"
                    >
                      —
                    </td>
                  )
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The empty frame. A native <select> rather than a custom menu: it is a list of
 * colleges on a page that is mostly a table, and the platform control is the
 * one that already works with a keyboard, a screen reader and a phone.
 */
function EmptySlot({
  options,
  onPick,
}: {
  options: CollegeOption[];
  onPick: (slug: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-bg-alt/60 p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        <Plus className="h-3.5 w-3.5 text-brand" />
        Add a college
      </span>

      {options.length > 0 ? (
        <select
          value=""
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label="Add a college to the comparison"
          className="mt-2 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-medium text-ink transition hover:border-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name} — {option.city}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">No other colleges available.</p>
      )}
    </div>
  );
}
