"use client";

import { ReactNode, useState } from "react";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { SectionEditor, type SectionItem } from "@/components/admin/section-editor";

/**
 * Page composer: one tab per section of a public page.
 *
 * The copy on the homepage — every heading and supporting line — is currently
 * hard-coded in app/(site)/page.tsx, so changing "Colleges Cherry Picked For
 * You" needs a developer. This is the screen that moves it to the content team,
 * which is what the proposal means by managing content without touching code.
 *
 * The tab order deliberately matches the order the sections appear on the live
 * page, so the sidebar reads like the page itself.
 */

export type PageSectionTab = {
  id: string;
  label: string;
  render: () => ReactNode;
};

export function PageSectionsAdmin({
  title,
  description,
  tabs,
}: {
  title: string;
  description: string;
  tabs: PageSectionTab[];
}) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <>
            <button
              type="button"
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
            >
              Preview
            </button>
            <button
              type="submit"
              form="page-sections-form"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Save changes
            </button>
          </>
        }
      />

      <AdminSection
        title={current.label}
        description="Copy, visibility and the order of the items in this section."
      >
        {/* Nothing is persisted yet — no page-content endpoint to post to. */}
        <form id="page-sections-form" onSubmit={(e) => e.preventDefault()}>
          <div
            role="tablist"
            aria-label={`${title} sections`}
            className="-mx-5 mb-6 flex gap-1 overflow-x-auto border-b border-line px-5"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`section-tab-${tab.id}`}
                aria-selected={active === tab.id}
                aria-controls={`section-panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  active === tab.id
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/*
            key forces a remount when the tab changes. Without it React
            reconciles the new panel onto the old DOM at the same position:
            defaultValue only applies on mount, and the item list keeps the
            state it was first initialised with — so every tab shows the first
            tab's copy and items.
          */}
          <div
            key={current.id}
            role="tabpanel"
            id={`section-panel-${current.id}`}
            aria-labelledby={`section-tab-${current.id}`}
          >
            {current.render()}
          </div>
        </form>
      </AdminSection>
    </div>
  );
}

export { SectionEditor };
export type { SectionItem };
