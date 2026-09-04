"use client";

import { useState } from "react";
import {
  homepageBands,
  programs,
  programBySlug,
  rankingListsForProgram,
  rankingListBySlug,
  bandColleges,
  collegesInProgram,
  type CollegeBand,
} from "@/lib/rankings-data";
import { TextField, TextAreaField } from "@/components/admin/admin-fields";

/**
 * Homepage college bands (MOM §1.7).
 *
 * Repeatable instances, not three fixed slots — so "Popular Colleges" can sit
 * alongside "Recommended Colleges" rather than replacing it (§11 Q7).
 *
 * Each band binds to a ranking list rather than holding its own ordered list of
 * colleges. That is the point of Workstream A: the band says *which* ranking to
 * show, and the ranking says *what order*. A band that kept its own copy would
 * be a second place to maintain the same ordering, and the two would disagree
 * the first time either changed.
 */
export function CollegeBandsEditor() {
  const [bands, setBands] = useState<CollegeBand[]>(homepageBands);

  const update = (id: string, patch: Partial<CollegeBand>) =>
    setBands((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const move = (id: string, direction: -1 | 1) =>
    setBands((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (id: string) => setBands((prev) => prev.filter((b) => b.id !== id));

  const add = () =>
    setBands((prev) => [
      ...prev,
      {
        id: `band-${Date.now()}`,
        heading: "New college band",
        subheading: "",
        programSlug: programs[0].slug,
        // Left unbound: a band pointing at a ranking from the wrong program
        // would show colleges the heading does not describe, so the editor has
        // to choose one.
        rankingListSlug: "",
        manualSlugs: [],
        limit: 6,
        isVisible: true,
      },
    ]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-soft">
        Each band shows one ranking list. Add as many as the page needs — the
        order here is the order they appear down the homepage.
      </p>

      <div className="space-y-4">
        {bands.map((band, index) => (
          <BandCard
            key={band.id}
            band={band}
            isFirst={index === 0}
            isLast={index === bands.length - 1}
            onChange={(patch) => update(band.id, patch)}
            onMove={(direction) => move(band.id, direction)}
            onRemove={() => remove(band.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
      >
        Add college band
      </button>
    </div>
  );
}

function BandCard({
  band,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  band: CollegeBand;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<CollegeBand>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = useState("");

  const lists = rankingListsForProgram(band.programSlug);
  const list = rankingListBySlug(band.rankingListSlug);
  const preview = band.rankingListSlug ? bandColleges(band) : [];

  // Manual picks are drawn from the band's program, not the whole directory:
  // promoting an engineering college into a management band would contradict
  // the heading.
  const candidates = collegesInProgram(band.programSlug).filter(
    (college) => !band.manualSlugs.includes(college.slug),
  );

  /**
   * Changing the program clears the ranking list with it. A list belongs to one
   * program, so keeping the old selection would leave the band bound to a
   * ranking that is no longer offered in the selector — visible on the page,
   * invisible in the form.
   */
  const changeProgram = (programSlug: string) =>
    onChange({ programSlug, rankingListSlug: "", manualSlugs: [] });

  const addManual = () => {
    if (!picking) return;
    onChange({ manualSlugs: [...band.manualSlugs, picking] });
    setPicking("");
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        band.isVisible ? "border-line bg-surface" : "border-line-soft bg-bg-alt"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex flex-col">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label={`Move ${band.heading} up`}
              className="px-1 text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label={`Move ${band.heading} down`}
              className="px-1 text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
            >
              ▼
            </button>
          </span>
          <h3 className="text-sm font-semibold text-ink">
            {band.heading || "Untitled band"}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={band.isVisible}
              onChange={(e) => onChange({ isVisible: e.target.checked })}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            />
            Show
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-ink-faint transition hover:text-brand"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Section heading"
          name={`${band.id}-heading`}
          value={band.heading}
          onChange={(value) => onChange({ heading: value })}
          hint='Rename freely — e.g. "Recommended Colleges" to "Popular Colleges".'
        />

        <div>
          <label htmlFor={`${band.id}-program`} className="block text-xs font-semibold text-ink">
            Program
          </label>
          <select
            id={`${band.id}-program`}
            value={band.programSlug}
            onChange={(e) => changeProgram(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            {programs.map((program) => (
              <option key={program.slug} value={program.slug}>
                {program.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${band.id}-list`} className="block text-xs font-semibold text-ink">
            Ranking list
          </label>
          <select
            id={`${band.id}-list`}
            value={band.rankingListSlug}
            onChange={(e) => onChange({ rankingListSlug: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Select a ranking…</option>
            {lists.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-faint">
            {lists.length === 0
              ? `No ranking lists for ${programBySlug(band.programSlug)?.name ?? "this program"} yet — add one under Rankings.`
              : list
                ? `Managed under Rankings · updated ${list.updatedAt}`
                : "Only lists for the selected program are offered."}
          </p>
        </div>

        <TextAreaField
          label="Supporting text"
          name={`${band.id}-subheading`}
          rows={2}
          defaultValue={band.subheading}
          className="sm:col-span-2"
        />

        <TextField
          label="Cards shown"
          name={`${band.id}-limit`}
          type="number"
          value={String(band.limit)}
          onChange={(value) => onChange({ limit: Math.max(1, Number(value) || 1) })}
        />
      </div>

      {/* Manual picks — the MOM's "add specific colleges by priority". These sit
          above the ranking's own order and consume slots from the limit, which
          is what makes a pick a guarantee rather than a suggestion. */}
      <div className="mt-4 border-t border-line-soft pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          Promoted colleges ({band.manualSlugs.length})
        </h4>
        <p className="mt-1 text-xs text-ink-soft">
          These lead the band in this order, ahead of the ranking. Everything
          else follows in ranking order.
        </p>

        <ol className="mt-2 space-y-1.5">
          {band.manualSlugs.map((slug, index) => {
            const college = collegesInProgram(band.programSlug).find((c) => c.slug === slug);
            return (
              <li
                key={slug}
                className="flex items-center gap-2 rounded-lg border border-brand/40 bg-brand-soft/40 px-3 py-1.5 text-sm"
              >
                <span className="w-4 text-xs font-semibold text-ink-faint">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {college?.name ?? slug}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ manualSlugs: band.manualSlugs.filter((s) => s !== slug) })
                  }
                  className="shrink-0 text-xs font-medium text-ink-faint transition hover:text-brand"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={picking}
            onChange={(e) => setPicking(e.target.value)}
            aria-label={`Promote a college into ${band.heading}`}
            className="min-w-56 flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Promote a college…</option>
            {candidates.map((college) => (
              <option key={college.slug} value={college.slug}>
                {college.name} — {college.city}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addManual}
            disabled={!picking}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {/* What the band will actually render, resolved through the same selector
          the homepage uses — so the preview cannot disagree with the page. */}
      <div className="mt-4 border-t border-line-soft pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          Preview ({preview.length} of {band.limit})
        </h4>
        {preview.length > 0 ? (
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {preview.map((college, index) => (
              <li
                key={college.slug}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft"
              >
                <span className="font-semibold text-ink-faint">{index + 1}.</span>{" "}
                {college.name}
                {band.manualSlugs.includes(college.slug) && (
                  <span className="ml-1 text-brand">· promoted</span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-ink-faint">
            {band.rankingListSlug
              ? "The selected ranking list has no colleges in it yet."
              : "Select a ranking list to see what this band will show."}
          </p>
        )}
      </div>
    </div>
  );
}
