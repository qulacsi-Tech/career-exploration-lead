"use client";

import { useState } from "react";
import type { FeaturedInput, LocationPicker } from "@/lib/api";

/*
  The Categories tab of a location: tick the categories (streams) the homepage card
  offers, then under each tick the colleges to list. A category's button on the card
  opens that category's colleges in the location; its colleges scroll in the card's list.

  Only colleges of a category are offered under it. Unticking a category drops its
  colleges. Left empty, the card works its categories out from the colleges in the city.
*/

const MAX_STREAMS = 6;
const MAX_COLLEGES = 12;

export function CategoriesPicker({
  picker,
  value,
  onChange,
}: {
  picker: LocationPicker;
  value: FeaturedInput[];
  onChange: (next: FeaturedInput[]) => void;
}) {
  const [search, setSearch] = useState<Record<string, string>>({});

  const rowOf = (stream: string) => value.find((f) => f.stream === stream);
  const full = value.length >= MAX_STREAMS;

  const toggleStream = (stream: string) => {
    if (rowOf(stream)) onChange(value.filter((f) => f.stream !== stream));
    else if (!full) onChange([...value, { stream, colleges: [] }]);
  };

  const setColleges = (stream: string, colleges: string[]) =>
    onChange(value.map((f) => (f.stream === stream ? { ...f, colleges } : f)));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">
          Categories <span className="font-normal text-ink-soft">({value.length} of {MAX_STREAMS})</span>
        </h3>
        <p className="mt-1 max-w-3xl text-xs text-ink-faint">
          Each ticked category becomes an &ldquo;Explore &hellip; Institutions&rdquo; button on the card. Under it, pick the colleges to list.
          Leave everything unticked to let the card use the categories of the colleges in this city.
        </p>
        {picker.streams.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No colleges are listed yet, so there are no categories to choose.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {picker.streams.map((stream) => {
              const on = !!rowOf(stream);
              return (
                <li key={stream}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      on ? "border-brand bg-brand-soft text-brand" : "border-line text-ink hover:border-brand"
                    } ${!on && full ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && full}
                      onChange={() => toggleStream(stream)}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                    {stream}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {value.map((row) => {
        const options = picker.colleges.filter((c) => c.stream === row.stream);
        const q = (search[row.stream] ?? "").trim().toLowerCase();
        const shown = q ? options.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q)) : options;
        const atLimit = row.colleges.length >= MAX_COLLEGES;
        return (
          <fieldset key={row.stream} className="rounded-xl border border-line bg-bg-alt p-4">
            <legend className="px-2 text-sm font-semibold text-ink">
              {row.stream} colleges <span className="font-normal text-ink-soft">({row.colleges.length} of {MAX_COLLEGES} picked)</span>
            </legend>

            {options.length === 0 ? (
              <p className="text-sm text-ink-soft">No {row.stream.toLowerCase()} colleges are listed yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    aria-label={`Search ${row.stream} colleges`}
                    value={search[row.stream] ?? ""}
                    onChange={(e) => setSearch((s) => ({ ...s, [row.stream]: e.target.value }))}
                    placeholder="Search by name or city"
                    className="w-full max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                  {row.colleges.length > 0 && (
                    <button type="button" onClick={() => setColleges(row.stream, [])} className="text-xs text-ink-soft underline-offset-4 hover:text-red-700 hover:underline">
                      Clear picks
                    </button>
                  )}
                </div>
                <ul className="mt-3 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto pr-1 md:grid-cols-2">
                  {shown.map((college) => {
                    const on = row.colleges.includes(college.slug);
                    return (
                      <li key={college.slug}>
                        <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg ${!on && atLimit ? "cursor-not-allowed opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!on && atLimit}
                            onChange={() =>
                              setColleges(row.stream, on ? row.colleges.filter((s) => s !== college.slug) : [...row.colleges, college.slug])
                            }
                            className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                          />
                          <span className="min-w-0 truncate text-ink">
                            {college.name} <span className="text-xs text-ink-faint">{college.city}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  {shown.length === 0 && <li className="px-2 py-1.5 text-sm text-ink-soft">No college matches &ldquo;{search[row.stream]}&rdquo;.</li>}
                </ul>
              </>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
