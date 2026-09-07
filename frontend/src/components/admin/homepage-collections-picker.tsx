"use client";

import Link from "next/link";
import { useState } from "react";
import {
  collections as seedCollections,
  collectionColleges,
  describeCollectionScope,
  describeOrdering,
  type Collection,
} from "@/lib/collections-data";

/**
 * The homepage's college bands, reduced to choosing which collections appear.
 *
 * Replaces CollegeBandsEditor, which carried the heading, program, ranking,
 * card count and promoted-college list all on this screen. Those fields did not
 * belong to the homepage — they describe the group of colleges itself, which
 * now has a page of its own and is edited under Content → Collections.
 *
 * What is genuinely a homepage decision stays here: which collections show,
 * what order they run down the page, and how many cards each one gets. Editing
 * anything else is a link away rather than a duplicate set of fields that would
 * disagree with the collection the moment either was touched.
 */
export function HomepageCollectionsPicker() {
  const [rows, setRows] = useState<Collection[]>(seedCollections);

  const placed = rows
    .filter((row) => row.placements.homepage)
    .sort((a, b) => a.placements.homepage!.order - b.placements.homepage!.order);

  const available = rows.filter((row) => !row.placements.homepage);

  const patch = (id: string, changes: Partial<Collection["placements"]["homepage"]>) =>
    setRows((prev) =>
      prev.map((row) =>
        row.id === id && row.placements.homepage
          ? {
              ...row,
              placements: {
                ...row.placements,
                homepage: { ...row.placements.homepage, ...changes },
              },
            }
          : row,
      ),
    );

  /** Order is stored per placement, so a move rewrites both neighbours' order. */
  const move = (id: string, direction: -1 | 1) => {
    const index = placed.findIndex((row) => row.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= placed.length) return;

    const a = placed[index];
    const b = placed[target];
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === a.id) {
          return {
            ...row,
            placements: {
              ...row.placements,
              homepage: { ...row.placements.homepage!, order: b.placements.homepage!.order },
            },
          };
        }
        if (row.id === b.id) {
          return {
            ...row,
            placements: {
              ...row.placements,
              homepage: { ...row.placements.homepage!, order: a.placements.homepage!.order },
            },
          };
        }
        return row;
      }),
    );
  };

  const remove = (id: string) =>
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, placements: { ...row.placements, homepage: undefined } }
          : row,
      ),
    );

  const addToHomepage = (id: string) =>
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              placements: {
                ...row.placements,
                homepage: { order: placed.length, limit: 6, isVisible: true },
              },
            }
          : row,
      ),
    );

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-soft">
        Each band shows one collection. The order here is the order they appear
        down the homepage — headings, colleges and SEO are edited on the
        collection itself, under{" "}
        <Link href="/admin/collections" className="font-medium text-brand hover:underline">
          Content → Collections
        </Link>
        .
      </p>

      <div className="space-y-3">
        {placed.map((collection, index) => {
          const placement = collection.placements.homepage!;
          const preview = collectionColleges(collection, { limit: placement.limit });
          const total = collectionColleges(collection, { limit: undefined }).length;

          return (
            <div key={collection.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(collection.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${collection.title} up`}
                      className="text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => move(collection.id, 1)}
                      disabled={index === placed.length - 1}
                      aria-label={`Move ${collection.title} down`}
                      className="text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink">
                      {collection.heading || collection.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {describeCollectionScope(collection.scope)} ·{" "}
                      {describeOrdering(collection)} · {total} college
                      {total === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={placement.isVisible}
                      onChange={(e) => patch(collection.id, { isVisible: e.target.checked })}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                    Show
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                    Cards
                    <input
                      type="number"
                      min={1}
                      value={placement.limit}
                      onChange={(e) =>
                        patch(collection.id, { limit: Number(e.target.value) || 6 })
                      }
                      className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                    />
                  </label>
                  <Link
                    href="/admin/collections"
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(collection.id)}
                    className="text-xs font-medium text-ink-faint hover:text-brand"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 border-t border-line-soft pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Preview ({preview.length} of {placement.limit})
                </p>
                {preview.length > 0 ? (
                  <ol className="mt-2 flex flex-wrap gap-2">
                    {preview.map((college, position) => (
                      <li
                        key={college.slug}
                        className="rounded-lg border border-line bg-bg-alt px-2.5 py-1 text-xs text-ink-soft"
                      >
                        {position + 1}. {college.name}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs text-brand">
                    Empty — this band will not render on the homepage.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {placed.length === 0 && (
          <p className="rounded-lg border border-dashed border-line bg-bg-alt px-4 py-8 text-center text-sm text-ink-soft">
            No collections on the homepage yet.
          </p>
        )}
      </div>

      {available.length > 0 && (
        <div>
          <label htmlFor="add-homepage-collection" className="block text-xs font-semibold text-ink">
            Add a collection to the homepage
          </label>
          <div className="mt-1.5 flex gap-2">
            <select
              id="add-homepage-collection"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addToHomepage(e.target.value);
                e.target.value = "";
              }}
              className="w-full max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="">Choose a collection…</option>
              {available.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title} — {describeCollectionScope(collection.scope)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
