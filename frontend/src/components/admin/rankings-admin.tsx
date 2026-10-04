"use client";

import { useState } from "react";
import { createRanking, saveRanking } from "@/lib/admin-actions";
import type { AdminRanking, AdminRankingEntry } from "@/lib/api";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, SelectField, NameSlugFields } from "@/components/admin/admin-fields";

type Row = { collegeSlug: string; rank: string; score: string };

/**
 * The ordered college list. Rows are edited in place and written to one hidden
 * field as JSON, so a save always carries the whole list. The API checks each
 * college exists, appears once, and has a unique rank.
 */
function EntriesEditor({
  colleges,
  initial,
}: {
  colleges: { slug: string; name: string }[];
  initial: AdminRankingEntry[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((e) => ({ collegeSlug: e.collegeSlug, rank: String(e.rank), score: e.score ?? "" })),
  );
  const used = new Set(rows.map((r) => r.collegeSlug));
  const nameOf = (slug: string) => colleges.find((c) => c.slug === slug)?.name ?? slug;

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const serialized = JSON.stringify(
    rows.map((r) => ({
      collegeSlug: r.collegeSlug,
      rank: /^\d+$/.test(r.rank) ? Number(r.rank) : r.rank,
      score: r.score.trim() === "" ? null : r.score.trim(),
    })),
  );

  const available = colleges.filter((c) => !used.has(c.slug));

  return (
    <div className="space-y-3">
      <input type="hidden" name="entries" value={serialized} />

      {rows.length === 0 && <p className="text-sm text-ink-soft">No colleges in this list yet.</p>}

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.collegeSlug} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem_auto] items-end gap-2">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-ink" htmlFor={`entry-${index}-college`}>
                College
              </label>
              <p id={`entry-${index}-college`} className="mt-1.5 truncate text-sm text-ink">
                {nameOf(row.collegeSlug)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink" htmlFor={`entry-${index}-rank`}>
                Rank
              </label>
              <input
                id={`entry-${index}-rank`}
                inputMode="numeric"
                value={row.rank}
                onChange={(e) => update(index, { rank: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink" htmlFor={`entry-${index}-score`}>
                Score
              </label>
              <input
                id={`entry-${index}-score`}
                value={row.score}
                onChange={(e) => update(index, { score: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${nameOf(row.collegeSlug)}`}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft transition hover:border-red-700 hover:text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <AddEntry
        available={available}
        onAdd={(slug) => setRows((prev) => [...prev, { collegeSlug: slug, rank: String(prev.length + 1), score: "" }])}
      />
    </div>
  );
}

function AddEntry({
  available,
  onAdd,
}: {
  available: { slug: string; name: string }[];
  onAdd: (slug: string) => void;
}) {
  const [picking, setPicking] = useState("");
  if (available.length === 0) return <p className="text-xs text-ink-faint">Every college is already in this list.</p>;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-60 flex-1">
        <label className="block text-xs font-semibold text-ink" htmlFor="entry-add">
          Add a college
        </label>
        <select
          id="entry-add"
          value={picking}
          onChange={(e) => setPicking(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Choose a college</option>
          {available.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={!picking}
        onClick={() => {
          onAdd(picking);
          setPicking("");
        }}
        className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40"
      >
        Add to list
      </button>
    </div>
  );
}

const STREAMS = ["Management", "Engineering", "Medical", "Science", "Arts", "Commerce", "Pharmacy", "Law"];

/**
 * Ranking lists: the details and the ordered colleges, edited together on one
 * tab. A single tab matters here: the form submits only the fields that are
 * mounted, so splitting the list and its details across tabs would drop unsaved
 * edits when switching between them.
 */
export function RankingsAdmin({
  lists,
  colleges,
}: {
  lists: AdminRanking[];
  colleges: { slug: string; name: string }[];
}) {
  return (
    <ResourceAdmin<AdminRanking>
      title="Rankings"
      description="Ordered college lists from NIRF and other authorities. Collections and college pages use these orders."
      addLabel="Add ranking list"
      addDescription="Details first, then the colleges in rank order. The slug cannot change later."
      rows={lists}
      getKey={(list) => list.slug}
      searchIn={(list) => [list.name, list.authority, list.stream ?? "", String(list.year)]}
      searchPlaceholder="Search name, authority, stream"
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
        { key: "authority", label: "Authority", render: (list) => list.authority },
        { key: "year", label: "Year", render: (list) => String(list.year) },
        { key: "stream", label: "Stream", render: (list) => list.stream ?? "—" },
        { key: "colleges", label: "Colleges", render: (list) => list.entries.length.toLocaleString("en-IN") },
      ]}
      renderView={(list) => (
        <div className="space-y-6">
          <AdminSubsection title="Ordered colleges">
            {list.entries.length === 0 ? (
              <p className="text-sm text-ink-soft">No colleges in this list yet.</p>
            ) : (
              <ol className="space-y-1 text-sm text-ink-soft">
                {list.entries.map((entry) => {
                  const name = colleges.find((c) => c.slug === entry.collegeSlug)?.name ?? entry.collegeSlug;
                  return (
                    <li key={entry.collegeSlug}>
                      <span className="tabular-nums text-ink">#{entry.rank}</span> · {name}
                      {entry.score ? ` · ${entry.score}` : ""}
                    </li>
                  );
                })}
              </ol>
            )}
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "ranking",
          label: "Ranking",
          render: (list) => (
            <div className="space-y-6">
              <FieldGrid>
                <TextField label="Name" name="name" defaultValue={list.name} required />
                <TextField label="Authority" name="authority" defaultValue={list.authority} required />
                <TextField label="Year" name="year" type="number" defaultValue={String(list.year)} required />
                <SelectField label="Stream" name="stream" defaultValue={list.stream ?? ""} options={["", ...STREAMS]} />
              </FieldGrid>
              <EntriesEditor colleges={colleges} initial={list.entries} />
            </div>
          ),
        },
      ]}
      onSave={(list, data) => saveRanking(list.slug, data)}
      onAdd={(data) => createRanking(undefined, data)}
      renderAddForm={() => (
        <>
          <NameSlugFields nameLabel="Name" namePlaceholder="NIRF Management Rankings 2026" slugPlaceholder="nirf-management-2026" />
          <TextField label="Authority" name="authority" placeholder="NIRF" required />
          <TextField label="Year" name="year" type="number" placeholder="2026" required />
          <SelectField label="Stream" name="stream" options={["", ...STREAMS]} />
          <div className="sm:col-span-2">
            <EntriesEditor colleges={colleges} initial={[]} />
          </div>
        </>
      )}
    />
  );
}
