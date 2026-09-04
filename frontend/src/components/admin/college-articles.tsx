"use client";

import { useState } from "react";
import {
  articlesFor,
  alertsFor,
  type CollegeArticle,
  type CollegeAlert,
} from "@/lib/college-content";
import { RichTextField } from "@/components/admin/rich-text-editor";
import { TextField, TextAreaField } from "@/components/admin/admin-fields";
import { richTextToPlain } from "@/lib/rich-text";

/**
 * Articles and News/Alerts — the two fixed sections the MOM adds alongside the
 * configurable tabs (§1.2).
 *
 * They are not tab templates. A tab template holds one document per college; an
 * article list holds many dated records, each with its own title, author and
 * body. Modelling them as a template would mean an editor adding the fifth news
 * item by scrolling to the bottom of a document and hand-matching the heading
 * style of the four above — which is how a content list turns into a mess that
 * cannot be sorted, filtered or syndicated.
 */

/* ------------------------------------------------------------------ *
 * Articles
 * ------------------------------------------------------------------ */

export function CollegeArticlesEditor({ collegeSlug }: { collegeSlug: string }) {
  const [articles, setArticles] = useState<CollegeArticle[]>(() => articlesFor(collegeSlug));
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const editing = articles.find((a) => a.slug === editingSlug) ?? null;

  const remove = (slug: string) => {
    setArticles((prev) => prev.filter((a) => a.slug !== slug));
    if (editingSlug === slug) setEditingSlug(null);
  };

  const addDraft = () => {
    const slug = `draft-${Date.now()}`;
    setArticles((prev) => [
      ...prev,
      {
        slug,
        collegeSlug,
        title: "",
        publishedAt: "",
        author: "",
        summary: "",
        body: { type: "doc", content: [] },
      },
    ]);
    setEditingSlug(slug);
  };

  if (editing) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setEditingSlug(null)}
          className="text-xs font-medium text-brand hover:underline"
        >
          ← Back to all articles
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Title"
            name="article-title"
            defaultValue={editing.title}
            className="sm:col-span-2"
          />
          <TextField label="Published" name="article-date" type="date" />
          <TextField label="Author" name="article-author" defaultValue={editing.author} />
          <TextAreaField
            label="Summary"
            name="article-summary"
            rows={2}
            defaultValue={editing.summary}
            hint="Shown in listings and used as the meta description if none is set."
            className="sm:col-span-2"
          />
        </div>

        <RichTextField
          label="Article body"
          hint="Headings, lists, tables and links. Images inside body content are out of scope this cycle."
          value={editing.body}
          minHeight={280}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Articles ({articles.length})
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            Long-form pieces attached to this college. Each gets its own page.
          </p>
        </div>
        <button
          type="button"
          onClick={addDraft}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Add article
        </button>
      </div>

      <ul className="space-y-2">
        {articles.map((article) => (
          <li key={article.slug} className="rounded-lg border border-line px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {article.title || "Untitled article"}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {[article.publishedAt, article.author].filter(Boolean).join(" · ") ||
                    "Not published"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                  {article.summary || richTextToPlain(article.body, 120) || "No summary yet."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlug(article.slug)}
                  className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand-soft"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(article.slug)}
                  className="text-xs font-medium text-ink-faint transition hover:text-brand"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
        {articles.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No articles for this college yet.
          </li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * News & alerts
 * ------------------------------------------------------------------ */

const ALERT_KINDS: CollegeAlert["kind"][] = ["Admission", "Exam", "Result", "Notice"];

/**
 * Alerts are short, dated and disposable — an application window, a counselling
 * round, a result. No rich text: a one-line title and an optional link is the
 * whole record, and giving it a document editor would invite paragraphs into a
 * format the public page renders as a single line.
 */
export function CollegeAlertsEditor({ collegeSlug }: { collegeSlug: string }) {
  const [alerts, setAlerts] = useState<CollegeAlert[]>(() => alertsFor(collegeSlug));

  const update = (id: string, patch: Partial<CollegeAlert>) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const remove = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const add = () =>
    setAlerts((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}`,
        collegeSlug,
        title: "",
        date: "",
        kind: "Notice",
        isUrgent: false,
      },
    ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            News &amp; alerts ({alerts.length})
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            Dated notices shown at the top of the college page. Urgent ones are
            highlighted and sort first.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
        >
          Add alert
        </button>
      </div>

      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`rounded-lg border p-3 ${
              alert.isUrgent ? "border-brand bg-brand-soft/30" : "border-line"
            }`}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                label="Title"
                name={`alert-${alert.id}-title`}
                value={alert.title}
                onChange={(value) => update(alert.id, { title: value })}
                placeholder="Application window closes 30 September"
                className="lg:col-span-2"
              />
              <TextField
                label="Date"
                name={`alert-${alert.id}-date`}
                value={alert.date}
                onChange={(value) => update(alert.id, { date: value })}
                placeholder="1 Sep 2026"
              />
              <div>
                <label
                  htmlFor={`alert-${alert.id}-kind`}
                  className="block text-xs font-semibold text-ink"
                >
                  Type
                </label>
                <select
                  id={`alert-${alert.id}-kind`}
                  value={alert.kind}
                  onChange={(e) =>
                    update(alert.id, { kind: e.target.value as CollegeAlert["kind"] })
                  }
                  className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  {ALERT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={alert.isUrgent}
                  onChange={(e) => update(alert.id, { isUrgent: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                Urgent — highlight and sort first
              </label>
              <button
                type="button"
                onClick={() => remove(alert.id)}
                className="text-xs font-medium text-ink-faint transition hover:text-brand"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No alerts for this college.
          </li>
        )}
      </ul>
    </div>
  );
}