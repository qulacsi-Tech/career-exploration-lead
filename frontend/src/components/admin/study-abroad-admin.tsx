"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { TextField, TextAreaField } from "@/components/admin/admin-fields";
import {
  deleteStudyAbroadItem,
  reorderStudyAbroadItems,
  saveFiguresReviewed,
  saveStudyAbroadItem,
} from "@/lib/admin-actions";
import type { StudyAbroadAdminContent, StudyAbroadKind } from "@/lib/api";

type FieldSpec = {
  name: string;
  label: string;
  multiline?: boolean;
  optional?: boolean;
  hint?: string;
};

const SECTIONS: {
  kind: StudyAbroadKind;
  title: string;
  description: string;
  itemLabel: string;
  /** The field shown as the row's title in the list. */
  titleField: string;
  fields: FieldSpec[];
}[] = [
  {
    kind: "destination",
    title: "Destinations",
    description: "Countries on the page. The slug is the link's identity and cannot be shared by two countries.",
    itemLabel: "destination",
    titleField: "country",
    fields: [
      { name: "slug", label: "URL slug", hint: "Lowercase letters, digits and hyphens, e.g. usa" },
      { name: "country", label: "Country" },
      { name: "tagline", label: "Tagline" },
      { name: "universities", label: "Universities", hint: "Rough count, e.g. 4,000+" },
      { name: "tuition", label: "Tuition (indicative)", hint: "e.g. ₹18L - 45L / year" },
      { name: "living", label: "Living costs (indicative)", hint: "e.g. ₹9L - 15L / year" },
      { name: "postStudyWork", label: "Post-study work" },
      { name: "intakes", label: "Intakes" },
      { name: "popularCourses", label: "Popular courses", multiline: true, hint: "Comma separated" },
    ],
  },
  {
    kind: "step",
    title: "Application steps",
    description: "The application year, in the order it happens.",
    itemLabel: "step",
    titleField: "title",
    fields: [
      { name: "title", label: "Title" },
      { name: "window", label: "Timing", hint: "e.g. 12-18 months ahead" },
      { name: "detail", label: "Detail", multiline: true },
    ],
  },
  {
    kind: "test",
    title: "Admission tests",
    description: "Language and aptitude tests the page lists.",
    itemLabel: "test",
    titleField: "name",
    fields: [
      { name: "name", label: "Test name" },
      { name: "purpose", label: "Purpose" },
      { name: "validity", label: "Validity" },
      { name: "href", label: "Link to an internal exam page", optional: true, hint: "Starts with /, e.g. /exams/gre. Leave empty for none." },
    ],
  },
  {
    kind: "faq",
    title: "FAQs",
    description: "Questions answered at the bottom of the page.",
    itemLabel: "question",
    titleField: "question",
    fields: [
      { name: "question", label: "Question" },
      { name: "answer", label: "Answer", multiline: true },
    ],
  },
];

type Row = Record<string, unknown> & { id: string };

function defaultValue(row: Row | null, field: string): string {
  if (!row) return "";
  const value = row[field];
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

function ItemForm({
  kind,
  section,
  row,
  onDone,
}: {
  kind: StudyAbroadKind;
  section: (typeof SECTIONS)[number];
  row: Row | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-4 rounded-xl border border-line bg-bg p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await saveStudyAbroadItem(kind, row?.id ?? null, data);
          if ("error" in result) {
            setError(result.error);
          } else {
            onDone();
            router.refresh();
          }
        });
      }}
    >
      {section.fields.map((field) =>
        field.multiline ? (
          <TextAreaField
            key={field.name}
            label={field.label}
            name={field.name}
            defaultValue={defaultValue(row, field.name)}
            hint={field.hint}
            className="sm:col-span-2"
          />
        ) : (
          <TextField
            key={field.name}
            label={field.label}
            name={field.name}
            defaultValue={defaultValue(row, field.name)}
            hint={field.hint}
            required={!field.optional}
          />
        ),
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : row ? "Save changes" : `Add ${section.itemLabel}`}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SectionEditor({
  section,
  rows,
  onMessage,
}: {
  section: (typeof SECTIONS)[number];
  rows: Row[];
  onMessage: (message: string | null) => void;
}) {
  const router = useRouter();
  // "new" for the add form, a row id for editing one row, null when closed.
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Swaps the row with its neighbour and saves the whole order, so the server
  // always receives every id of this kind exactly once.
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const ids = rows.map((row) => row.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onMessage(null);
    startTransition(async () => {
      const result = await reorderStudyAbroadItems(section.kind, ids);
      if ("error" in result) onMessage(result.error);
      else router.refresh();
    });
  };

  const remove = (row: Row) => {
    if (!window.confirm(`Delete this ${section.itemLabel}? This cannot be undone.`)) return;
    onMessage(null);
    startTransition(async () => {
      const result = await deleteStudyAbroadItem(section.kind, row.id);
      if ("error" in result) onMessage(result.error);
      else router.refresh();
    });
  };

  return (
    <AdminSection
      title={section.title}
      description={section.description}
      actions={
        <button
          type="button"
          onClick={() => setEditing(editing === "new" ? null : "new")}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Add {section.itemLabel}
        </button>
      }
    >
      {editing === "new" && (
        <ItemForm kind={section.kind} section={section} row={null} onDone={() => setEditing(null)} />
      )}

      {rows.length === 0 && editing !== "new" && (
        <p className="text-sm text-ink-soft">No {section.title.toLowerCase()} yet.</p>
      )}

      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id} className="rounded-xl border border-line bg-surface p-4">
            {editing === row.id ? (
              <ItemForm kind={section.kind} section={section} row={row} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 truncate font-medium text-ink">{String(row[section.titleField] ?? "")}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    aria-label={`Move ${String(row[section.titleField] ?? "")} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${String(row[section.titleField] ?? "")} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(row.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-red-700 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}

export function StudyAbroadAdmin({ content }: { content: StudyAbroadAdminContent }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rowsFor: Record<StudyAbroadKind, Row[]> = {
    destination: content.destinations,
    step: content.applicationSteps,
    test: content.admissionTests,
    faq: content.faqs,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Study abroad"
        description="The destinations, costs, steps, tests and FAQs on the public study-abroad page."
      />

      {message && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <AdminSection
        title="Figures reviewed"
        description="The date shown beside the indicative tuition and living-cost ranges."
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const data = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await saveFiguresReviewed(data);
              if ("error" in result) setMessage(result.error);
              else router.refresh();
            });
          }}
        >
          <div className="min-w-60 flex-1">
            <TextField label="Reviewed" name="value" defaultValue={content.figuresReviewed ?? ""} required />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            Save date
          </button>
        </form>
      </AdminSection>

      {SECTIONS.map((section) => (
        <SectionEditor
          key={section.kind}
          section={section}
          rows={rowsFor[section.kind]}
          onMessage={setMessage}
        />
      ))}
    </div>
  );
}
