"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminSection, AdminSubsection } from "@/components/admin/admin-section";
import { AdminModal } from "@/components/admin/admin-modal";
import { TextField, TextAreaField, slugify } from "@/components/admin/admin-fields";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  collections as seedCollections,
  collectionColleges,
  collectionHref,
  collegesInScope,
  describeCollectionScope,
  describeOrdering,
  overlapsExistingPage,
  canonicalFor,
  selectionOutsideScope,
  publishBlocker,
  type Collection,
} from "@/lib/collections-data";
import { colleges, locations, exams, courses } from "@/lib/mock-data";
import { programs, rankingLists, rankingListsForProgram } from "@/lib/rankings-data";
import { emptyDoc, type RichTextDoc } from "@/lib/rich-text";

/**
 * Collections — the CMS screen for curated groups of colleges.
 *
 * Moved out of Sections → Homepage, where it lived as the "College bands" tab.
 * A band was only ever one *placement* of a collection, so editing collections
 * inside the homepage editor meant a group that also appears in the footer had
 * to be maintained from a screen named after a page it is not on. Under Content
 * it sits with the other things that own a URL.
 *
 * Deliberately not built on `ResourceAdmin`. That shell is a table plus a flat
 * field form, which fits Courses and Exams; a collection needs a two-pane member
 * picker — an ordered list of what is in, a searchable checklist to add from —
 * and a preview that re-resolves as the selection changes. Same reasoning that
 * keeps Colleges on its own screen.
 */
export function CollectionsAdmin() {
  const [rows, setRows] = useState<Collection[]>(seedCollections);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.title, row.slug, describeCollectionScope(row.scope)]
        .some((field) => field.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const save = (next: Collection) => {
    setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
    setEditing(null);
  };

  const add = () => {
    const created: Collection = {
      id: `collection-${Date.now()}`,
      slug: "",
      title: "",
      heading: "",
      subheading: "",
      scope: {},
      collegeSlugs: [],
      rankingListSlug: "",
      seo: { metaTitle: "", metaDescription: "", intro: emptyDoc(), faqs: [] },
      placements: {},
      isPublished: false,
      updatedAt: "Not saved",
    };
    setRows((prev) => [...prev, created]);
    setEditing(created);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Collections"
        description="Curated groups of colleges. Each one owns a page, and can be placed on the homepage, in the footer, or both."
        actions={
          <button
            type="button"
            onClick={add}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            New collection
          </button>
        }
      />

      <AdminSection
        title="All collections"
        description={`${filtered.length} of ${rows.length} shown`}
        actions={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections"
            aria-label="Search collections"
            className="w-56 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        }
      >
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">Collection</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Contains</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Ordered by</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Appears on</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Colleges</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <CollectionRow key={row.id} collection={row} onEdit={() => setEditing(row)} />
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-ink-soft">
                    {rows.length === 0
                      ? "No collections yet."
                      : `Nothing matches “${query}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      {editing && (
        <CollectionEditor
          key={editing.id}
          collection={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * List row
 * ------------------------------------------------------------------ */

function CollectionRow({
  collection,
  onEdit,
}: {
  collection: Collection;
  onEdit: () => void;
}) {
  const count = collectionColleges(collection, { limit: undefined }).length;
  const blocker = publishBlocker(collection);
  const placements = [
    collection.placements.homepage && "Homepage",
    collection.placements.footer && `Footer · ${collection.placements.footer.column}`,
  ].filter(Boolean) as string[];

  return (
    <tr className="border-b border-line-soft last:border-b-0">
      <td className="py-3 pr-3">
        <p className="font-medium text-ink">{collection.title || "Untitled collection"}</p>
        <p className="text-xs text-ink-faint">
          {collection.slug ? collectionHref(collection) : "No URL set"}
        </p>
      </td>

      {/* The badges: what this collection is a category of. */}
      <td className="py-3 pr-3">
        <ScopeBadges collection={collection} />
      </td>

      <td className="py-3 pr-3 text-ink-soft">{describeOrdering(collection)}</td>

      <td className="py-3 pr-3 text-ink-soft">
        {placements.length > 0 ? (
          <span className="text-xs">{placements.join(" · ")}</span>
        ) : (
          <span className="text-xs text-ink-faint">Page only</span>
        )}
      </td>

      <td className="py-3 pr-3">
        <span className={count === 0 ? "text-brand" : "text-ink-soft"}>{count}</span>
      </td>

      <td className="py-3 pl-3">
        <div className="flex items-center justify-end gap-2">
          {collection.isPublished ? (
            <span className="rounded-full bg-bg-alt px-2.5 py-1 text-[11px] font-medium text-ink-soft">
              Live
            </span>
          ) : (
            <span
              className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-gold"
              title={blocker ?? "Not published yet"}
            >
              Draft
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * The scope as badges — "Management", "Bangalore", "CAT".
 *
 * One chip per filter rather than the joined string `describeCollectionScope`
 * returns, because on this screen they are the thing being scanned: an editor
 * looking for "which of these is the Bangalore one" reads chips faster than a
 * sentence. The joined form is still used where it has to fit one line.
 */
function ScopeBadges({ collection }: { collection: Collection }) {
  const { programSlug, locationSlug, examSlug, courseSlug } = collection.scope;

  const badges: { label: string; tone: "brand" | "neutral" }[] = [];
  if (programSlug) {
    badges.push({
      label: programs.find((p) => p.slug === programSlug)?.name ?? programSlug,
      tone: "brand",
    });
  }
  if (locationSlug) {
    badges.push({
      label: locations.find((l) => l.slug === locationSlug)?.name ?? locationSlug,
      tone: "neutral",
    });
  }
  if (examSlug) {
    const exam = exams.find((e) => e.slug === examSlug);
    badges.push({
      label: exam ? exam.name.replace(/^.*\(([^)]+)\)$/, "$1") : examSlug.toUpperCase(),
      tone: "neutral",
    });
  }
  if (courseSlug) {
    badges.push({
      label: courses.find((c) => c.slug === courseSlug)?.name ?? courseSlug,
      tone: "neutral",
    });
  }


  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.length === 0 && (
        <span className="text-xs text-ink-faint">All colleges</span>
      )}
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            badge.tone === "brand"
              ? "border-brand-soft bg-brand-soft text-brand-ink"
              : "border-line bg-bg-alt text-ink-soft"
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */

type EditorTab = "details" | "colleges" | "seo" | "placements";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "colleges", label: "Scope & Colleges" },
  { id: "seo", label: "SEO" },
  { id: "placements", label: "Placements" },
];

function CollectionEditor({
  collection,
  onCancel,
  onSave,
}: {
  collection: Collection;
  onCancel: () => void;
  onSave: (next: Collection) => void;
}) {
  const [draft, setDraft] = useState<Collection>(collection);
  const [tab, setTab] = useState<EditorTab>("details");

  const patch = (changes: Partial<Collection>) => setDraft((prev) => ({ ...prev, ...changes }));
  const patchScope = (changes: Partial<Collection["scope"]>) =>
    setDraft((prev) => ({ ...prev, scope: { ...prev.scope, ...changes } }));

  const blocker = publishBlocker(draft);
  const resolved = collectionColleges(draft, { limit: undefined });

  return (
    <AdminModal
      open
      onClose={onCancel}
      size="full"
      title={draft.title || "New collection"}
      description={draft.slug ? collectionHref(draft) : "Set a title and URL to publish this."}
      footer={
        <>
          <p className="mr-auto text-xs text-ink-soft">
            {resolved.length} college{resolved.length === 1 ? "" : "s"} in this collection
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="collection-form"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Save collection
          </button>
        </>
      }
    >
      {/* Nothing is persisted yet — no endpoint to post to. */}
      <form
        id="collection-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
        className="flex h-full flex-col"
      >
        <div
          role="tablist"
          aria-label="Collection fields"
          className="-mx-5 flex gap-1 overflow-x-auto border-b border-line px-5"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === entry.id
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-5">
          {tab === "details" && <DetailsTab draft={draft} patch={patch} />}
          {tab === "colleges" && (
            <CollegesTab draft={draft} patch={patch} patchScope={patchScope} resolved={resolved} />
          )}
          {tab === "seo" && <SeoTab draft={draft} patch={patch} />}
          {tab === "placements" && <PlacementsTab draft={draft} patch={patch} blocker={blocker} />}
        </div>
      </form>
    </AdminModal>
  );
}

/* --- Details ------------------------------------------------------- */

function DetailsTab({
  draft,
  patch,
}: {
  draft: Collection;
  patch: (changes: Partial<Collection>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        label="Title"
        name="collection-title"
        required
        value={draft.title}
        onChange={(value) => {
          // The slug follows the title only while it is still empty — an
          // existing slug is a live URL and every indexed result points at it.
          patch(draft.slug ? { title: value } : { title: value, slug: slugify(value) });
        }}
        hint="The page's H1, and the label used in the footer."
      />
      <TextField
        label="URL slug"
        name="collection-slug"
        required
        value={draft.slug}
        onChange={(value) => patch({ slug: slugify(value) })}
        hint={`Resolves to /colleges/${draft.slug || "…"}`}
      />
      <TextField
        label="Homepage heading"
        name="collection-heading"
        value={draft.heading}
        onChange={(value) => patch({ heading: value })}
        hint="Only when the band should read differently from the title. Blank uses the title."
      />
      <TextField
        label="Supporting text"
        name="collection-subheading"
        value={draft.subheading}
        onChange={(value) => patch({ subheading: value })}
      />
    </div>
  );
}

/* --- Scope & Colleges ---------------------------------------------- */

function CollegesTab({
  draft,
  patch,
  patchScope,
  resolved,
}: {
  draft: Collection;
  patch: (changes: Partial<Collection>) => void;
  patchScope: (changes: Partial<Collection["scope"]>) => void;
  resolved: ReturnType<typeof collectionColleges>;
}) {
  const scoped = collegesInScope(draft.scope);
  const strays = selectionOutsideScope(draft);
  const hasScope = Object.values(draft.scope).some(Boolean);

  // Rankings are per program, so binding one from a different program would
  // order the collection by a list that does not contain its colleges.
  const availableRankings = draft.scope.programSlug
    ? rankingListsForProgram(draft.scope.programSlug)
    : rankingLists;

  const toggle = (slug: string) =>
    patch({
      collegeSlugs: draft.collegeSlugs.includes(slug)
        ? draft.collegeSlugs.filter((s) => s !== slug)
        : [...draft.collegeSlugs, slug],
    });

  const move = (slug: string, direction: -1 | 1) => {
    const index = draft.collegeSlugs.indexOf(slug);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= draft.collegeSlugs.length) return;
    const next = [...draft.collegeSlugs];
    [next[index], next[target]] = [next[target], next[index]];
    patch({ collegeSlugs: next });
  };

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="Category"
        description="What this collection is a group of. It sets the badges and the page's SEO context, and filters the list you pick colleges from — it does not add colleges on its own."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScopeSelect
            label="Program"
            name="scope-program"
            value={draft.scope.programSlug ?? ""}
            options={programs.map((p) => ({ value: p.slug, label: p.name }))}
            onChange={(value) =>
              // The bound ranking belongs to the old program, so it is cleared
              // rather than left pointing at a list from a different field.
              patch({
                scope: { ...draft.scope, programSlug: value || undefined },
                rankingListSlug: "",
              })
            }
          />
          <ScopeSelect
            label="Location"
            name="scope-location"
            value={draft.scope.locationSlug ?? ""}
            options={locations.map((l) => ({ value: l.slug, label: l.name }))}
            onChange={(value) => patchScope({ locationSlug: value || undefined })}
          />
          <ScopeSelect
            label="Exam accepted"
            name="scope-exam"
            value={draft.scope.examSlug ?? ""}
            options={exams.map((e) => ({ value: e.slug, label: e.name }))}
            onChange={(value) => patchScope({ examSlug: value || undefined })}
          />
          <ScopeSelect
            label="Course offered"
            name="scope-course"
            value={draft.scope.courseSlug ?? ""}
            options={courses.map((c) => ({ value: c.slug, label: c.name }))}
            onChange={(value) => patchScope({ courseSlug: value || undefined })}
          />
        </div>

        {hasScope && (
          <p className="mt-3 text-xs text-ink-soft">
            {describeCollectionScope(draft.scope)} —{" "}
            <span className="font-semibold text-ink">{scoped.length}</span> college
            {scoped.length === 1 ? "" : "s"} in the directory match. Choose the ones
            that belong below.
          </p>
        )}
      </AdminSubsection>

      <AdminSubsection
        title="Order"
        description="A ranking list orders the colleges you have chosen. It never adds one."
      >
        <div className="max-w-sm">
          <label htmlFor="collection-ranking" className="block text-xs font-semibold text-ink">
            Ranking list
          </label>
          <select
            id="collection-ranking"
            value={draft.rankingListSlug}
            onChange={(e) => patch({ rankingListSlug: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Keep the order I chose</option>
            {availableRankings.map((list) => (
              <option key={list.slug} value={list.slug}>
                {list.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-faint">
            Managed under Rankings. Colleges the ranking does not list keep your
            order, after the ranked ones.
          </p>
        </div>
      </AdminSubsection>

      {strays.length > 0 && (
        <div className="rounded-lg border border-gold-soft bg-gold-soft px-4 py-3 text-xs text-ink">
          <p className="font-semibold">
            {strays.length} chosen college{strays.length === 1 ? "" : "s"} outside this category
          </p>
          <p className="mt-1 text-ink-soft">
            They still appear — your selection decides. Worth a check:{" "}
            {strays.map((slug) => colleges.find((c) => c.slug === slug)?.name ?? slug).join(", ")}.
          </p>
        </div>
      )}

      <AdminSubsection
        title={`In this collection — ${draft.collegeSlugs.length}`}
        description="Only these appear on the page. Nothing is added automatically."
      >
        <ChosenColleges draft={draft} onRemove={toggle} onMove={move} />
      </AdminSubsection>

      <AdminSubsection title="Add colleges" description="Tick a college to include it.">
        <CollegeChecklist draft={draft} scoped={scoped} hasScope={hasScope} onToggle={toggle} />
      </AdminSubsection>

      {draft.rankingListSlug && resolved.length > 0 && (
        <AdminSubsection
          title="Preview"
          description="The page in order, after the ranking is applied. A homepage placement cuts this to its card count."
        >
          <ol className="flex flex-wrap gap-2">
            {resolved.map((college, index) => (
              <li
                key={college.slug}
                className="rounded-lg border border-line bg-bg-alt px-3 py-1.5 text-xs text-ink-soft"
              >
                <span className="font-medium text-ink">{index + 1}.</span> {college.name}
              </li>
            ))}
          </ol>
        </AdminSubsection>
      )}
    </div>
  );
}

/**
 * The chosen colleges, in the editor's order.
 *
 * Separate from the picker below rather than being highlighted rows inside it:
 * this list is the collection, and reordering it by hunting for ticked rows in a
 * scrolling directory of thousands is not something anyone should have to do.
 */
function ChosenColleges({
  draft,
  onRemove,
  onMove,
}: {
  draft: Collection;
  onRemove: (slug: string) => void;
  onMove: (slug: string, direction: -1 | 1) => void;
}) {
  if (draft.collegeSlugs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-bg-alt px-4 py-6 text-center text-xs text-ink-soft">
        No colleges chosen yet. Pick them below — this collection cannot be
        published while it is empty.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line-soft rounded-lg border border-line">
      {draft.collegeSlugs.map((slug, index) => {
        const college = colleges.find((c) => c.slug === slug);

        return (
          <li key={slug} className="flex items-center gap-3 px-3 py-2">
            <span className="w-5 shrink-0 text-xs font-medium text-ink-faint">{index + 1}.</span>

            <div className="min-w-0 flex-1">
              {college ? (
                <>
                  <p className="truncate text-sm text-ink">{college.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {college.city} · {college.stream}
                  </p>
                </>
              ) : (
                /* The college left the directory after being chosen. Shown rather
                   than silently dropped, so the row can actually be cleared. */
                <p className="truncate text-sm text-brand">
                  {slug} — no longer in the directory
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(slug, -1)}
                disabled={index === 0}
                aria-label={`Move ${college?.name ?? slug} up`}
                className="rounded border border-line px-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove(slug, 1)}
                disabled={index === draft.collegeSlugs.length - 1}
                aria-label={`Move ${college?.name ?? slug} down`}
                className="rounded border border-line px-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onRemove(slug)}
                className="ml-1 rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ScopeSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <select
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The directory, with a checkbox per college.
 *
 * Defaults to the category's matches when one is set, because that is the list
 * an editor building "MBA Colleges in Bangalore" wants to work through. The
 * toggle widens it to everything: choosing outside the category is allowed, and
 * a picker that hid the rest would make it look impossible.
 */
function CollegeChecklist({
  draft,
  scoped,
  hasScope,
  onToggle,
}: {
  draft: Collection;
  scoped: ReturnType<typeof collegesInScope>;
  hasScope: boolean;
  onToggle: (slug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [scopedOnly, setScopedOnly] = useState(true);

  const pool = hasScope && scopedOnly ? scoped : colleges;
  const inScope = useMemo(() => new Set(scoped.map((college) => college.slug)), [scoped]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((college) =>
      [college.name, college.city, college.stream].some((field) => field.toLowerCase().includes(q)),
    );
  }, [pool, search]);

  const allShown =
    visible.length > 0 && visible.every((college) => draft.collegeSlugs.includes(college.slug));

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-3 py-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colleges"
          aria-label="Search colleges to add"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />

        {hasScope && (
          <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-soft">
            <input
              type="checkbox"
              checked={scopedOnly}
              onChange={(e) => setScopedOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-brand)]"
            />
            Only {describeCollectionScope(draft.scope)}
          </label>
        )}

        <button
          type="button"
          onClick={() =>
            visible.forEach((college) => {
              // Toggle only the rows that need it, so "Select all" does not
              // deselect colleges that were already in.
              if (draft.collegeSlugs.includes(college.slug) === allShown) onToggle(college.slug);
            })
          }
          disabled={visible.length === 0}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40"
        >
          {allShown ? "Clear these" : "Select all shown"}
        </button>
      </div>

      <ul className="max-h-72 overflow-y-auto">
        {visible.map((college) => {
          const checked = draft.collegeSlugs.includes(college.slug);
          const inputId = `pick-${college.slug}`;

          return (
            <li key={college.slug} className="border-b border-line-soft last:border-b-0">
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-bg-alt"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(college.slug)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{college.name}</span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {college.city} · {college.stream}
                    {hasScope && !inScope.has(college.slug) && " · outside this category"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}

        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ink-soft">
            {search ? `Nothing matches “${search}”.` : "No colleges match this category."}
          </li>
        )}
      </ul>
    </div>
  );
}


function SeoTab({
  draft,
  patch,
}: {
  draft: Collection;
  patch: (changes: Partial<Collection>) => void;
}) {
  const overlap = overlapsExistingPage(draft);
  const canonical = canonicalFor(draft);

  const patchSeo = (changes: Partial<Collection["seo"]>) =>
    patch({ seo: { ...draft.seo, ...changes } });

  return (
    <div className="space-y-6">
      {overlap && (
        <div className="rounded-lg border border-gold-soft bg-gold-soft px-4 py-3 text-xs text-ink">
          <p className="font-semibold">This overlaps a page that already exists</p>
          <p className="mt-1 text-ink-soft">
            The scope is a single filter, so <code className="font-mono">{overlap}</code> already
            serves these colleges. Both pages would compete for the same search
            query, so the canonical below points at that page unless you set your
            own. Narrowing the scope — adding a city or an exam — makes this a
            page worth having on its own.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Meta title"
          name="seo-title"
          required
          value={draft.seo.metaTitle}
          onChange={(value) => patchSeo({ metaTitle: value })}
          hint={`${draft.seo.metaTitle.length} characters — around 60 shows in full.`}
          className="sm:col-span-2"
        />
        <TextAreaField
          label="Meta description"
          name="seo-description"
          rows={3}
          defaultValue={draft.seo.metaDescription}
          hint="Around 155 characters shows in full."
          className="sm:col-span-2"
        />
        <TextField
          label="Canonical URL"
          name="seo-canonical"
          value={draft.seo.canonical ?? ""}
          onChange={(value) => patchSeo({ canonical: value || undefined })}
          hint={`Blank uses ${canonical}`}
          className="sm:col-span-2"
        />
      </div>

      <AdminSubsection
        title="Intro copy"
        description="Body text above the listing. Optional — many collections are a list alone."
      >
        <RichTextEditor
          value={draft.seo.intro}
          onChange={(doc: RichTextDoc) => patchSeo({ intro: doc })}
          minHeight={160}
        />
      </AdminSubsection>
    </div>
  );
}

/* --- Placements ---------------------------------------------------- */

function PlacementsTab({
  draft,
  patch,
  blocker,
}: {
  draft: Collection;
  patch: (changes: Partial<Collection>) => void;
  blocker: string | null;
}) {
  const { homepage, footer } = draft.placements;

  const patchPlacements = (changes: Partial<Collection["placements"]>) =>
    patch({ placements: { ...draft.placements, ...changes } });

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="Published"
        description="An unpublished collection has no page, and appears nowhere on the site."
      >
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.isPublished}
            disabled={blocker !== null && !draft.isPublished}
            onChange={(e) => patch({ isPublished: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)] disabled:opacity-40"
          />
          <span>
            Live on the site
            {blocker && (
              <span className="mt-0.5 block text-[11px] text-brand">{blocker}</span>
            )}
          </span>
        </label>
      </AdminSubsection>

      <AdminSubsection
        title="Homepage band"
        description="Shows this collection as a row of cards on the homepage."
      >
        {homepage ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              label="Order down the page"
              name="homepage-order"
              type="number"
              value={String(homepage.order)}
              onChange={(value) =>
                patchPlacements({ homepage: { ...homepage, order: Number(value) || 0 } })
              }
            />
            <TextField
              label="Cards shown"
              name="homepage-limit"
              type="number"
              value={String(homepage.limit)}
              onChange={(value) =>
                patchPlacements({ homepage: { ...homepage, limit: Number(value) || 6 } })
              }
            />
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={homepage.isVisible}
                  onChange={(e) =>
                    patchPlacements({ homepage: { ...homepage, isVisible: e.target.checked } })
                  }
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Show
              </label>
              <button
                type="button"
                onClick={() => patchPlacements({ homepage: undefined })}
                className="text-xs font-medium text-ink-faint hover:text-brand"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              patchPlacements({ homepage: { order: 99, limit: 6, isVisible: true } })
            }
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Add to homepage
          </button>
        )}
      </AdminSubsection>

      <AdminSubsection
        title="Footer link"
        description="Adds this collection to a footer column. A new column name creates the column."
      >
        {footer ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              label="Column heading"
              name="footer-column"
              value={footer.column}
              onChange={(value) => patchPlacements({ footer: { ...footer, column: value } })}
              hint="e.g. MBA, Engineering, Exams"
            />
            <TextField
              label="Order in column"
              name="footer-order"
              type="number"
              value={String(footer.order)}
              onChange={(value) =>
                patchPlacements({ footer: { ...footer, order: Number(value) || 0 } })
              }
            />
            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={() => patchPlacements({ footer: undefined })}
                className="text-xs font-medium text-ink-faint hover:text-brand"
              >
                Remove from footer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => patchPlacements({ footer: { column: "MBA", order: 99 } })}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            Add to footer
          </button>
        )}
      </AdminSubsection>
    </div>
  );
}
