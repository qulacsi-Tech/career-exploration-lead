"use client";

import { useState } from "react";
import { createCollection, saveCollection } from "@/lib/admin-actions";
import type { AdminCollectionOptions, Collection, CollectionOption } from "@/lib/api";
import type { RichTextDoc } from "@/lib/rich-text";
import { AdminSubsection } from "@/components/admin/admin-section";
import { ResourceAdmin, FieldGrid } from "@/components/admin/resource-admin";
import { TextField, SelectField, TextAreaField, Field, NameSlugFields } from "@/components/admin/admin-fields";

/** The intro is edited as plain paragraphs. Blank lines separate them. */
function introText(doc: RichTextDoc | undefined): string {
  if (!doc || !Array.isArray(doc.content)) return "";
  return doc.content
    .map((node) => {
      const block = node as { content?: { text?: string }[] };
      return (block.content ?? []).map((t) => t.text ?? "").join("");
    })
    .filter((p) => p.trim() !== "")
    .join("\n\n");
}

type Faq = { question: string; answer: string };

function FaqEditor({ initial }: { initial: Faq[] }) {
  const [rows, setRows] = useState<Faq[]>(initial);
  const update = (i: number, patch: Partial<Faq>) =>
    setRows((prev) => prev.map((row, index) => (index === i ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <input type="hidden" name="faqs" value={JSON.stringify(rows)} />
      {rows.length === 0 && <p className="text-sm text-ink-soft">No questions yet.</p>}
      {rows.map((row, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-line p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-semibold text-ink" htmlFor={`faq-${i}-q`}>
                Question
              </label>
              <input
                id={`faq-${i}-q`}
                value={row.question}
                onChange={(e) => update(i, { question: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, index) => index !== i))}
              className="rounded-lg border border-line px-2.5 py-2 text-sm text-ink-soft transition hover:border-red-700 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink" htmlFor={`faq-${i}-a`}>
              Answer
            </label>
            <textarea
              id={`faq-${i}-a`}
              rows={2}
              value={row.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={rows.length >= 20}
        onClick={() => setRows((prev) => [...prev, { question: "", answer: "" }])}
        className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40"
      >
        Add question
      </button>
    </div>
  );
}

/** Ordered members. Rows are kept as slugs; the names come from the directory. */
function CollegeOrder({ options, initial }: { options: CollectionOption[]; initial: string[] }) {
  const [slugs, setSlugs] = useState<string[]>(initial);
  const [picking, setPicking] = useState("");
  const nameOf = (slug: string) => options.find((o) => o.slug === slug)?.name ?? slug;
  const available = options.filter((o) => !slugs.includes(o.slug));
  const move = (i: number, d: -1 | 1) =>
    setSlugs((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name="colleges" value={JSON.stringify(slugs)} />
      {slugs.length === 0 && <p className="text-sm text-ink-soft">No colleges yet. A published collection needs at least one.</p>}
      <ol className="space-y-2">
        {slugs.map((slug, i) => (
          <li key={slug} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {i + 1}. {nameOf(slug)}
            </span>
            <button type="button" aria-label={`Move ${nameOf(slug)} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
            <button type="button" aria-label={`Move ${nameOf(slug)} down`} disabled={i === slugs.length - 1} onClick={() => move(i, 1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
            <button type="button" aria-label={`Remove ${nameOf(slug)}`} onClick={() => setSlugs((prev) => prev.filter((s) => s !== slug))} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-60 flex-1">
          <label className="block text-xs font-semibold text-ink" htmlFor="collection-college-add">Add a college</label>
          <select id="collection-college-add" value={picking} onChange={(e) => setPicking(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none">
            <option value="">Choose a college</option>
            {available.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </div>
        <button type="button" disabled={!picking} onClick={() => { setSlugs((prev) => [...prev, picking]); setPicking(""); }} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-40">Add to collection</button>
      </div>
    </div>
  );
}

/** Every editable field of a collection, shared by the add and edit forms. */
function CollectionFields({
  options,
  collection,
  withTitle = true,
}: {
  options: AdminCollectionOptions;
  collection: Collection | null;
  /** The add form takes its title from the name field beside the slug. */
  withTitle?: boolean;
}) {
  const named = (list: CollectionOption[]) => (slug: string) => list.find((o) => o.slug === slug)?.name ?? slug;
  const withNone = (list: CollectionOption[]) => ["", ...list.map((o) => o.slug)];
  const noneLabel = (list: CollectionOption[]) => {
    const name = named(list);
    return (slug: string) => (slug === "" ? "None" : name(slug));
  };

  const scope = collection?.scope ?? {};
  const ranking = collection?.rankingListSlug ?? "";
  const rankingKnown = !ranking || options.rankings.some((r) => r.slug === ranking);
  const homepage = collection?.placements?.homepage;
  const footer = collection?.placements?.footer;
  const seo = collection?.seo;

  return (
    <div className="space-y-6">
      <AdminSubsection title="Details">
        <FieldGrid>
          {withTitle && <TextField label="Title" name="title" defaultValue={collection?.title ?? ""} required />}
          <TextField label="Heading" name="heading" defaultValue={collection?.heading ?? ""} hint="Shown above the list. Defaults to the title." />
          <TextField label="Subheading" name="subheading" defaultValue={collection?.subheading ?? ""} className="sm:col-span-2 lg:col-span-1" />
        </FieldGrid>
      </AdminSubsection>

      <AdminSubsection title="Scope" description="What the collection is a category of. Membership is the list below, not the scope.">
        <FieldGrid>
          <SelectField label="Programme" name="programSlug" defaultValue={scope.programSlug ?? ""} options={withNone(options.programs)} labelFor={noneLabel(options.programs)} />
          <SelectField label="City" name="locationSlug" defaultValue={scope.locationSlug ?? ""} options={withNone(options.locations)} labelFor={noneLabel(options.locations)} />
          <SelectField label="Entrance exam" name="examSlug" defaultValue={scope.examSlug ?? ""} options={withNone(options.exams)} labelFor={noneLabel(options.exams)} />
          <SelectField label="Course" name="courseSlug" defaultValue={scope.courseSlug ?? ""} options={withNone(options.courses)} labelFor={noneLabel(options.courses)} />
        </FieldGrid>
      </AdminSubsection>

      <AdminSubsection title="Colleges and order">
        <div className="mb-4 max-w-sm">
          <SelectField
            label="Order by ranking list"
            name="rankingListSlug"
            defaultValue={ranking}
            options={withNone(options.rankings)}
            labelFor={noneLabel(options.rankings)}
          />
          {!rankingKnown && (
            <p role="status" className="mt-1 text-xs text-red-700">
              This collection points at a ranking list that is not in the database. Choose a list or None before saving.
            </p>
          )}
        </div>
        <CollegeOrder options={options.colleges} initial={collection?.collegeSlugs ?? []} />
      </AdminSubsection>

      <AdminSubsection title="Placements">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="homepageOn" defaultChecked={!!homepage} className="h-4 w-4 rounded border-line text-brand" />
            Show as a band on the homepage
          </label>
          <FieldGrid>
            <TextField label="Band order" name="homepageOrder" type="number" defaultValue={String(homepage?.order ?? 0)} />
            <TextField label="Colleges shown" name="homepageLimit" type="number" defaultValue={String(homepage?.limit ?? 6)} hint="1 to 24" />
            <label className="flex items-end gap-2 pb-2 text-sm text-ink">
              <input type="checkbox" name="homepageVisible" defaultChecked={homepage?.isVisible ?? true} className="h-4 w-4 rounded border-line text-brand" />
              Visible
            </label>
          </FieldGrid>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="footerOn" defaultChecked={!!footer} className="h-4 w-4 rounded border-line text-brand" />
            Link from the site footer
          </label>
          <FieldGrid>
            <TextField label="Footer column" name="footerColumn" defaultValue={footer?.column ?? ""} hint="e.g. MBA, Engineering" />
            <TextField label="Link order" name="footerOrder" type="number" defaultValue={String(footer?.order ?? 0)} />
          </FieldGrid>
        </div>
      </AdminSubsection>

      <AdminSubsection title="Search and page copy">
        <FieldGrid>
          <TextField label="Meta title" name="metaTitle" defaultValue={seo?.metaTitle ?? ""} hint="Up to 70 characters. Required to publish." />
          <TextField label="Canonical path" name="canonical" defaultValue={seo?.canonical ?? ""} hint="Optional, starts with /. Leave empty to use the default." />
          <TextAreaField label="Meta description" name="metaDescription" defaultValue={seo?.metaDescription ?? ""} rows={2} hint="Up to 170 characters. Required to publish." className="sm:col-span-2 lg:col-span-3" />
          <TextAreaField label="Intro" name="intro" defaultValue={introText(seo?.intro)} rows={4} hint="Plain text. Separate paragraphs with a blank line." className="sm:col-span-2 lg:col-span-3" />
        </FieldGrid>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-ink">Questions and answers</p>
          <FaqEditor initial={seo?.faqs ?? []} />
        </div>
      </AdminSubsection>

      <AdminSubsection title="Publishing">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="isPublished" defaultChecked={collection?.isPublished ?? false} className="h-4 w-4 rounded border-line text-brand" />
          Published on the site
        </label>
        <p className="mt-1 text-xs text-ink-soft">Publishing needs at least one college, a meta title and a meta description.</p>
      </AdminSubsection>
    </div>
  );
}

export function CollectionsAdmin({
  collections,
  options,
}: {
  collections: Collection[];
  options: AdminCollectionOptions;
}) {
  const nameOf = (list: CollectionOption[], slug: string) => list.find((o) => o.slug === slug)?.name ?? slug;

  return (
    <ResourceAdmin<Collection>
      title="Collections"
      description="Curated groups of colleges: the homepage bands, footer links and the collection pages that link them."
      addLabel="Add collection"
      addDescription="Details, scope and colleges now. Publish once the page copy is ready."
      rows={collections}
      getKey={(c) => c.slug}
      searchIn={(c) => [c.title, c.slug]}
      searchPlaceholder="Search title or slug"
      columns={[
        {
          key: "title",
          label: "Collection",
          className: "text-ink",
          render: (c) => (
            <>
              <p className="font-medium text-ink">{c.title}</p>
              <p className="text-xs text-ink-faint">/colleges/{c.slug}</p>
            </>
          ),
        },
        {
          key: "scope",
          label: "Scope",
          render: (c) => {
            const parts = [
              c.scope.programSlug && nameOf(options.programs, c.scope.programSlug),
              c.scope.locationSlug && nameOf(options.locations, c.scope.locationSlug),
              c.scope.examSlug && nameOf(options.exams, c.scope.examSlug),
              c.scope.courseSlug && nameOf(options.courses, c.scope.courseSlug),
            ].filter(Boolean);
            return parts.length ? parts.join(" · ") : "—";
          },
        },
        { key: "colleges", label: "Colleges", render: (c) => c.collegeSlugs.length.toLocaleString("en-IN") },
        {
          key: "status",
          label: "Status",
          render: (c) => (c.isPublished ? "Published" : "Draft"),
        },
      ]}
      renderView={(c) => (
        <div className="space-y-6">
          <AdminSubsection title="Placements">
            <p className="text-sm text-ink-soft">
              Homepage: {c.placements?.homepage ? `order ${c.placements.homepage.order}, ${c.placements.homepage.limit} colleges${c.placements.homepage.isVisible ? "" : ", hidden"}` : "not shown"}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Footer: {c.placements?.footer ? `${c.placements.footer.column}, order ${c.placements.footer.order}` : "not linked"}
            </p>
          </AdminSubsection>
          <AdminSubsection title="Colleges">
            <ol className="space-y-1 text-sm text-ink-soft">
              {c.collegeSlugs.map((slug) => (
                <li key={slug}>{nameOf(options.colleges, slug)}</li>
              ))}
            </ol>
          </AdminSubsection>
          <AdminSubsection title="Search copy">
            <Field label="Meta title" value={c.seo?.metaTitle || "—"} />
            <p className="mt-2 text-sm text-ink-soft">{c.seo?.metaDescription || "—"}</p>
          </AdminSubsection>
        </div>
      )}
      editTabs={[
        {
          id: "collection",
          label: "Collection",
          render: (c) => <CollectionFields options={options} collection={c} />,
        },
      ]}
      onSave={(c, data) => saveCollection(c.slug, data)}
      onAdd={(data) => createCollection(undefined, data)}
      renderAddForm={() => (
        <>
          <NameSlugFields nameLabel="Title" nameFieldName="title" namePlaceholder="MBA Colleges in Pune" slugPlaceholder="mba-colleges-in-pune" />
          <div className="sm:col-span-2">
            <CollectionFields options={options} collection={null} withTitle={false} />
          </div>
        </>
      )}
    />
  );
}
