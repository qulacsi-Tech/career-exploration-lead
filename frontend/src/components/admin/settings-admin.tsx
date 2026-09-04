"use client";

import { useState } from "react";
import { tabTemplates, type TabTemplate } from "@/lib/college-content";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { TextField, slugify } from "@/components/admin/admin-fields";

/**
 * Site settings. Today that means the college tab templates — the MOM's
 * "3–4 dynamic tabs configurable from the admin panel" (§1.2).
 *
 * They live here rather than on a college because the 5 Sep decision made them
 * global: a tab is defined once and every college fills it in. Putting the
 * definition on a college record would imply the opposite.
 */
export function SettingsAdmin() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Site settings"
        description="Configuration that applies across the site rather than to one record."
      />
      <TabTemplatesSection />
    </div>
  );
}

function TabTemplatesSection() {
  const [templates, setTemplates] = useState<TabTemplate[]>(() =>
    [...tabTemplates].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [newLabel, setNewLabel] = useState("");

  const activeCount = templates.filter((t) => t.isActive).length;

  const update = (slug: string, patch: Partial<TabTemplate>) =>
    setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, ...patch } : t)));

  /**
   * Reordering swaps `sortOrder` with the neighbour rather than reassigning the
   * whole list. Every other row keeps the number it had, which is what a real
   * PATCH would send — two rows, not the entire collection.
   */
  const move = (slug: string, direction: -1 | 1) =>
    setTemplates((prev) => {
      const sorted = [...prev].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = sorted.findIndex((t) => t.slug === slug);
      const swapWith = index + direction;
      if (index === -1 || swapWith < 0 || swapWith >= sorted.length) return prev;

      const a = sorted[index];
      const b = sorted[swapWith];
      return prev.map((t) => {
        if (t.slug === a.slug) return { ...t, sortOrder: b.sortOrder };
        if (t.slug === b.slug) return { ...t, sortOrder: a.sortOrder };
        return t;
      });
    });

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;

    const slug = slugify(label);
    // A duplicate slug would make two tabs write to the same content record,
    // so the second one is refused rather than quietly shadowing the first.
    if (!slug || templates.some((t) => t.slug === slug)) return;

    setTemplates((prev) => [
      ...prev,
      {
        slug,
        label,
        sortOrder: Math.max(0, ...prev.map((t) => t.sortOrder)) + 1,
        isActive: true,
      },
    ]);
    setNewLabel("");
  };

  const proposedSlug = slugify(newLabel.trim());
  const duplicate = proposedSlug.length > 0 && templates.some((t) => t.slug === proposedSlug);

  const ordered = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminSection
      title="College tabs"
      description={`${activeCount} active of ${templates.length}. Active tabs appear on every college's edit screen.`}
    >
      <p className="text-xs text-ink-soft">
        A tab defined here appears on every college, and shows on the public page
        only for colleges that have written something into it. Switching one off
        hides it everywhere without discarding the copy already entered.
      </p>

      <ul className="mt-4 space-y-2">
        {ordered.map((template, index) => (
          <li
            key={template.slug}
            className={`rounded-lg border px-3 py-2.5 ${
              template.isActive ? "border-line" : "border-line-soft bg-bg-alt"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(template.slug, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${template.label} up`}
                  className="px-1 text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(template.slug, 1)}
                  disabled={index === ordered.length - 1}
                  aria-label={`Move ${template.label} down`}
                  className="px-1 text-xs text-ink-faint transition hover:text-brand disabled:opacity-30"
                >
                  ▼
                </button>
              </span>

              <span className="min-w-48 flex-1">
                {/* The label is editable in place — "tab names should be
                    editable/dynamic" is the MOM's wording, and a rename is the
                    most common edit by far. */}
                <input
                  value={template.label}
                  onChange={(e) => update(template.slug, { label: e.target.value })}
                  aria-label={`Tab name for ${template.slug}`}
                  className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm font-medium text-ink focus:border-brand focus:outline-none"
                />
                <span className="mt-1 block text-[11px] text-ink-faint">
                  {/* The slug does not follow a rename: it keys the content
                      every college has already written under this tab. */}
                  {template.slug} · renaming does not move existing content
                </span>
              </span>

              <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={template.isActive}
                  onChange={(e) => update(template.slug, { isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                Active
              </label>
            </div>

            <div className="mt-2">
              <input
                value={template.hint ?? ""}
                onChange={(e) => update(template.slug, { hint: e.target.value })}
                placeholder="Hint shown to editors under the field"
                aria-label={`Editor hint for ${template.label}`}
                className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line-soft pt-4">
        <TextField
          label="New tab name"
          name="new-tab-label"
          value={newLabel}
          onChange={setNewLabel}
          placeholder="Placement Cell"
          hint={
            duplicate
              ? `A tab with the slug "${proposedSlug}" already exists.`
              : proposedSlug
                ? `Slug: ${proposedSlug}`
                : "Becomes a tab on every college's edit screen."
          }
          className="min-w-56 flex-1"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newLabel.trim() || duplicate}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add tab
        </button>
      </div>

      <p className="mt-4 rounded-lg border border-line-soft bg-bg-alt px-3 py-2 text-xs text-ink-soft">
        Nothing here persists yet — there is no settings endpoint. Changes last
        as long as the page.
      </p>
    </AdminSection>
  );
}
