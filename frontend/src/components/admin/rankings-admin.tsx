"use client";

import { useMemo, useState } from "react";
import {
  RankingList,
  RankingEntry,
  programs,
  rankingTypes,
  rankingTypeBySlug,
  programBySlug,
  rankedColleges,
  rankingListSize,
  describeScope,
  collegesInProgram,
} from "@/lib/rankings-data";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { SelectField, TextField, Field, NameSlugFields } from "@/components/admin/admin-fields";

/**
 * Rankings module: the ranking configurations the MOM asks for — a program, a
 * ranking type, and the ordered colleges that fall out of the pair.
 *
 * This is the screen the other two MOM asks read from. The admin college
 * filter and the homepage band binding both select a program and then a
 * ranking list from here; neither computes an ordering of its own.
 *
 * Built on ResourceAdmin like Courses, Specialisations and Exams rather than a
 * bespoke screen — the table, search and dialog wiring are identical, and the
 * only thing unusual is the ordered college list, which is one edit tab.
 */
export function RankingsAdmin({ lists }: { lists: RankingList[] }) {
  return (
    <ResourceAdmin<RankingList>
      title="Rankings"
      description="Ranking configurations — a program and a ranking type, with the colleges that make up the list."
      addLabel="Add ranking list"
      addDescription="Pick the program and ranking type; colleges are added on the record afterwards."
      rows={lists}
      getKey={(list) => list.slug}
      searchIn={(list) => [
        list.name,
        programBySlug(list.programSlug)?.name ?? "",
        rankingTypeBySlug(list.rankingTypeSlug)?.name ?? "",
        list.scopeValue,
      ]}
      searchPlaceholder="Search name, program, type"
      columns={[
        {
          key: "name",
          label: "Ranking list",
          className: "text-ink",
          render: (list) => (
            <>
              <p className="font-medium text-ink">{list.name}</p>
              <p className="text-xs text-ink-faint">{list.slug}</p>
            </>
          ),
        },
        {
          key: "program",
          label: "Program",
          render: (list) => programBySlug(list.programSlug)?.name ?? "—",
        },
        {
          key: "type",
          label: "Ranking type",
          render: (list) => rankingTypeBySlug(list.rankingTypeSlug)?.name ?? "—",
        },
        { key: "scope", label: "Scope", render: (list) => describeScope(list) || "—" },
        {
          key: "colleges",
          label: "Colleges",
          render: (list) => rankingListSize(list.slug).toLocaleString(),
        },
        { key: "updated", label: "Updated", render: (list) => list.updatedAt },
      ]}
      renderView={(list) => (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Program" value={programBySlug(list.programSlug)?.name ?? "—"} />
            <Field
              label="Ranking type"
              value={rankingTypeBySlug(list.rankingTypeSlug)?.name ?? "—"}
            />
            <Field label="Scope" value={describeScope(list) || "—"} />
            <Field label="Colleges" value={rankingListSize(list.slug).toLocaleString()} />
            <Field label="Last updated" value={list.updatedAt} />
            <Field label="Slug" value={list.slug} />
          </dl>

          <AdminSubsection title="Colleges in this list" description="In the order they appear on the site.">
            <ol className="space-y-1.5">
              {rankedColleges(list.slug).map(({ entry, college }, index) => (
                <li
                  key={college.slug}
                  className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2 text-sm"
                >
                  <span className="w-5 shrink-0 text-xs font-semibold text-ink-faint">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{college.name}</span>
                    <span className="block truncate text-xs text-ink-faint">
                      {college.city}, {college.state}
                    </span>
                  </span>
                  {entry.isPinned && (
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                      Pinned
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-ink-faint">Rank {entry.rank}</span>
                </li>
              ))}
              {rankedColleges(list.slug).length === 0 && (
                <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-soft">
                  No colleges in this list yet.
                </li>
              )}
            </ol>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "config",
          label: "Configuration",
          render: (list) => <ConfigTab list={list} />,
        },
        {
          id: "colleges",
          label: "Colleges",
          render: (list) => <CollegesTab list={list} />,
        },
      ]}
      renderAddForm={() => <AddRankingListForm />}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

/**
 * Program, ranking type and scope.
 *
 * The scope field changes shape with the ranking type — a city name, an
 * authority, an exam, or nothing at all for a national list. Rendering one
 * generic "scope value" box for all four would leave an editor guessing what
 * to type into it.
 */
function ScopeField({ typeSlug, defaultValue }: { typeSlug: string; defaultValue: string }) {
  const type = rankingTypeBySlug(typeSlug);

  if (!type || type.scope === "national") {
    return (
      <div>
        <span className="block text-xs font-semibold text-ink">Scope</span>
        <p className="mt-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-soft">
          India — a national list needs no scope value.
        </p>
      </div>
    );
  }

  if (type.scope === "authority") {
    return (
      <SelectField
        label="Authority"
        name="ranking-scope"
        options={["NIRF", "India Today", "Outlook", "The Week", "QS India"]}
        defaultValue={defaultValue || "NIRF"}
      />
    );
  }

  if (type.scope === "exam") {
    return (
      <TextField
        label="Exam"
        name="ranking-scope"
        defaultValue={defaultValue}
        placeholder="cat"
        hint="Exam slug, e.g. cat, neet-ug."
      />
    );
  }

  return (
    <TextField
      label="City"
      name="ranking-scope"
      defaultValue={defaultValue}
      placeholder="Bengaluru"
      hint="Colleges are matched on their city field."
    />
  );
}

function ConfigTab({ list }: { list: RankingList }) {
  // Held in state rather than uncontrolled: the scope field below is chosen by
  // the ranking type, so the type has to be readable as it changes.
  const [typeSlug, setTypeSlug] = useState(list.rankingTypeSlug);

  return (
    <div className="space-y-6">
      <FieldGrid>
        <NameSlugFields
          nameLabel="List name"
          defaultName={list.name}
          defaultSlug={list.slug}
          nameFieldName="ranking-name"
          slugFieldName="ranking-slug"
        />
        <SelectField
          label="Program"
          name="ranking-program"
          options={programs.map((program) => program.name)}
          defaultValue={programBySlug(list.programSlug)?.name}
        />
        <div>
          <label htmlFor="ranking-type" className="block text-xs font-semibold text-ink">
            Ranking type
          </label>
          <select
            id="ranking-type"
            name="ranking-type"
            value={typeSlug}
            onChange={(e) => setTypeSlug(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            {rankingTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <ScopeField typeSlug={typeSlug} defaultValue={list.scopeValue} />
      </FieldGrid>

      <p className="rounded-lg border border-line-soft bg-bg-alt px-3 py-2 text-xs text-ink-soft">
        This list is selectable on the homepage section editor and the college
        list filter once a program is set.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Colleges
 * ------------------------------------------------------------------ */

/**
 * The ordered college list, with the pin and priority controls the MOM asks
 * for: "option to add specific colleges to the list, by priority or ranking".
 *
 * Pinning is presented as promotion rather than reordering on purpose. The
 * underlying rank is a fact about the ranking — NIRF says what NIRF says — and
 * an editor who wants a college in the top slot should be overriding the
 * display, not rewriting the source number. That is why a pinned row keeps
 * showing its real rank alongside its priority.
 */
function CollegesTab({ list }: { list: RankingList }) {
  const initial = useMemo(
    () => rankedColleges(list.slug).map((row) => row.entry),
    [list.slug],
  );
  const [entries, setEntries] = useState<RankingEntry[]>(initial);
  const [picking, setPicking] = useState("");

  const program = programBySlug(list.programSlug);
  const candidates = collegesInProgram(list.programSlug).filter(
    (college) => !entries.some((entry) => entry.collegeSlug === college.slug),
  );

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) return a.priority - b.priority;
      return a.rank - b.rank;
    });
    return sorted.map((entry) => ({
      entry,
      college: collegesInProgram(list.programSlug).find((c) => c.slug === entry.collegeSlug),
    }));
  }, [entries, list.programSlug]);

  const pinnedCount = entries.filter((entry) => entry.isPinned).length;

  const togglePin = (collegeSlug: string) =>
    setEntries((prev) =>
      prev.map((entry) =>
        entry.collegeSlug === collegeSlug
          ? {
              ...entry,
              isPinned: !entry.isPinned,
              // A newly pinned row goes to the end of the pinned group rather
              // than jumping the queue ahead of existing pins.
              priority: entry.isPinned ? 0 : pinnedCount + 1,
            }
          : entry,
      ),
    );

  const setPriority = (collegeSlug: string, priority: number) =>
    setEntries((prev) =>
      prev.map((entry) =>
        entry.collegeSlug === collegeSlug ? { ...entry, priority } : entry,
      ),
    );

  const setRank = (collegeSlug: string, rank: number) =>
    setEntries((prev) =>
      prev.map((entry) => (entry.collegeSlug === collegeSlug ? { ...entry, rank } : entry)),
    );

  const remove = (collegeSlug: string) =>
    setEntries((prev) => prev.filter((entry) => entry.collegeSlug !== collegeSlug));

  const add = () => {
    if (!picking) return;
    setEntries((prev) => [
      ...prev,
      {
        rankingListSlug: list.slug,
        collegeSlug: picking,
        // Appended at the end of the computed order; the editor sets the real
        // rank, or pins it if the point was to promote it.
        rank: prev.reduce((max, entry) => Math.max(max, entry.rank), 0) + 1,
        isPinned: false,
        priority: 0,
      },
    ]);
    setPicking("");
  };

  return (
    <div className="space-y-5">
      <AdminSubsection
        title="Colleges in this list"
        description={`${entries.length} in the list${pinnedCount ? `, ${pinnedCount} pinned to the top` : ""}. Pinned entries display above the ranked order.`}
      >
        <ol className="space-y-2">
          {rows.map(({ entry, college }, index) => (
            <li
              key={entry.collegeSlug}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${
                entry.isPinned ? "border-brand bg-brand-soft/40" : "border-line-soft"
              }`}
            >
              <span className="w-5 shrink-0 text-xs font-semibold text-ink-faint">{index + 1}</span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {college?.name ?? entry.collegeSlug}
                </span>
                <span className="block truncate text-xs text-ink-faint">
                  {college ? `${college.city}, ${college.state}` : "College no longer in the directory"}
                </span>
              </span>

              <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                Rank
                <input
                  type="number"
                  min={1}
                  value={entry.rank}
                  onChange={(e) => setRank(entry.collegeSlug, Number(e.target.value))}
                  aria-label={`Rank for ${college?.name ?? entry.collegeSlug}`}
                  className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </label>

              {entry.isPinned && (
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                  Priority
                  <input
                    type="number"
                    min={1}
                    value={entry.priority}
                    onChange={(e) => setPriority(entry.collegeSlug, Number(e.target.value))}
                    aria-label={`Priority for ${college?.name ?? entry.collegeSlug}`}
                    className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() => togglePin(entry.collegeSlug)}
                aria-pressed={entry.isPinned}
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  entry.isPinned
                    ? "border-brand bg-brand text-white"
                    : "border-line text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                {entry.isPinned ? "Pinned" : "Pin"}
              </button>

              <button
                type="button"
                onClick={() => remove(entry.collegeSlug)}
                className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Remove
              </button>
            </li>
          ))}

          {rows.length === 0 && (
            <li className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-ink-soft">
              No colleges yet. Add one below.
            </li>
          )}
        </ol>
      </AdminSubsection>

      <AdminSubsection
        title="Add a college"
        description={`Only ${program?.name ?? "matching"} colleges are offered — a ranking list belongs to one program.`}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="ranking-add-college" className="block text-xs font-semibold text-ink">
              College
            </label>
            <select
              id="ranking-add-college"
              value={picking}
              onChange={(e) => setPicking(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="">Select a college…</option>
              {candidates.map((college) => (
                <option key={college.slug} value={college.slug}>
                  {college.name} — {college.city}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!picking}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to list
          </button>
        </div>
        {candidates.length === 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            Every {program?.name.toLowerCase() ?? "matching"} college in the directory is already
            in this list.
          </p>
        )}
      </AdminSubsection>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Add
 * ------------------------------------------------------------------ */

function AddRankingListForm() {
  const [typeSlug, setTypeSlug] = useState(rankingTypes[0].slug);

  return (
    <>
      <NameSlugFields
        nameLabel="List name"
        namePlaceholder="Top Engineering Colleges in Bengaluru"
        defaultName=""
        nameFieldName="ranking-name"
        slugFieldName="ranking-slug"
      />
      <SelectField
        label="Program"
        name="ranking-program"
        options={programs.map((program) => program.name)}
      />
      <div>
        <label htmlFor="new-ranking-type" className="block text-xs font-semibold text-ink">
          Ranking type
        </label>
        <select
          id="new-ranking-type"
          name="ranking-type"
          value={typeSlug}
          onChange={(e) => setTypeSlug(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {rankingTypes.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      <ScopeField typeSlug={typeSlug} defaultValue="" />
    </>
  );
}
