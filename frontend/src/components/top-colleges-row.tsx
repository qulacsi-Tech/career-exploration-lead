"use client";

import { useCallback, useState } from "react";
import type { BandPage, College } from "@/lib/api";
import { CollegeSlider } from "@/components/college-slider";
import { TopCollegeCard } from "@/components/top-college-card";
import { ViewAllButton } from "@/components/ui/view-all-button";

/*
  One homepage college section, split into a tab per category.

  The categories are the streams of the colleges chosen for the section, in the order the
  Fields list gives them. Choosing a tab swaps the cards in place, with no page load. With
  a single category there are no tabs.

  A category with three colleges or fewer is a plain row of cards. With more it is a slider,
  and the slider is paged by the server: the page arrives with the first `limit` colleges of
  each category, and the next page of a category is fetched when the visitor reaches the end
  of what is loaded, until all of them are. "View all" goes to the chosen category's colleges
  (or, with no tabs, to the section's own page).
*/

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const streamSlug = (name: string) => name.toLowerCase().replace(/ /g, "-");

type Loaded = { colleges: College[]; page: number; loading: boolean; failed: boolean };

export function TopCollegesRow({
  slug,
  colleges,
  totals,
  categories,
  limit,
  label,
  buttonLabel,
  viewAllLabel,
  viewAllHref,
}: {
  /** The section's own slug, used to fetch the next pages. */
  slug: string;
  /** The first page of every category, as the server sent it. */
  colleges: College[];
  /** How many colleges each category holds in all. */
  totals: Record<string, number>;
  /** Category names in the admin's order (the Fields list). */
  categories: string[];
  /** Cards per page. */
  limit: number;
  /** For the slider's accessible name. */
  label: string;
  buttonLabel: string;
  viewAllLabel: string;
  /** Where "View all" goes when no category is chosen. */
  viewAllHref: string;
}) {
  const [active, setActive] = useState("");
  const [loaded, setLoaded] = useState<Record<string, Loaded>>(() => {
    const out: Record<string, Loaded> = {};
    for (const c of colleges) {
      (out[c.stream] ??= { colleges: [], page: 1, loading: false, failed: false }).colleges.push(c);
    }
    return out;
  });

  const present = categories.filter((c) => loaded[c]);
  const extra = Object.keys(loaded).filter((s) => s && !categories.includes(s));
  const tabs = [...present, ...extra];
  // One category: no tabs, and its colleges are the whole section.
  const current = tabs.includes(active) ? active : tabs[0] ?? "";
  const state = loaded[current];
  const total = totals[current] ?? state?.colleges.length ?? 0;
  const hasMore = !!state && !state.failed && state.colleges.length < total;

  const loadMore = useCallback(() => {
    const category = current;
    const s = loaded[category];
    if (!s || s.loading || s.failed) return;
    setLoaded((all) => ({ ...all, [category]: { ...all[category], loading: true } }));
    fetch(`${API_BASE}/collections/${encodeURIComponent(slug)}/homepage-colleges?stream=${encodeURIComponent(category)}&page=${s.page + 1}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: { data: BandPage }) =>
        setLoaded((all) => {
          const have = new Set(all[category].colleges.map((c) => c.slug));
          return {
            ...all,
            [category]: {
              colleges: [...all[category].colleges, ...json.data.colleges.filter((c) => !have.has(c.slug))],
              page: json.data.page,
              loading: false,
              failed: false,
            },
          };
        })
      )
      // A failed page leaves what is loaded in place and stops asking, rather than looping.
      .catch(() => setLoaded((all) => ({ ...all, [category]: { ...all[category], loading: false, failed: true } })));
  }, [current, loaded, slug]);

  const shown = state?.colleges ?? [];
  const slides = total > 3;

  return (
    <>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="College categories" className="mt-7 flex flex-wrap justify-center gap-3">
          {tabs.map((tab) => {
            const on = tab === current;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(tab)}
                className={`rounded-md border px-4 py-2 text-sm transition ${
                  on ? "border-brand text-brand" : "border-line text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      {/* Keyed by category so the slider starts at its first card on every tab. */}
      <div role="tabpanel" key={current || "all"}>
        {slides ? (
          <CollegeSlider
            colleges={shown}
            label={current ? `${label}: ${current}` : label}
            buttonLabel={buttonLabel}
            hasMore={hasMore}
            loadingMore={state?.loading}
            onLoadMore={loadMore}
          />
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.slice(0, Math.max(limit, 3)).map((college) => (
              <TopCollegeCard key={college.slug} college={college} buttonLabel={buttonLabel} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <ViewAllButton href={current && tabs.length > 1 ? `/${streamSlug(current)}/colleges` : viewAllHref}>{viewAllLabel}</ViewAllButton>
      </div>
    </>
  );
}
