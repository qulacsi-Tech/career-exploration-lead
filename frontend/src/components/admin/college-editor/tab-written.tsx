"use client";

import { RichTextField } from "@/components/admin/rich-text-editor";
import { isRichTextEmpty, type RichTextDoc } from "@/lib/rich-text";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { Card, TextArea, TextInput } from "@/components/admin/college-editor/shared";
import { DEFAULT_TAB_ICON, TAB_ICONS } from "@/lib/tab-icons";

/*
  The written sections of the college page (Admissions, Infrastructure, Scholarships), each a
  rich-text document, and the SEO text. A section left empty makes the page show an empty
  message instead of a blank tab.
*/

export function WrittenTab({ record, update, tab, title, description }: EditorProps & { tab: string; title: string; description: string }) {
  const doc = record.detail.tabs[tab];
  const header = record.detail.tabHeaders?.[tab] ?? { label: "", heading: "", icon: "" };
  const shownIcon = header.icon || DEFAULT_TAB_ICON[tab] || "grad";

  const setHeader = (patch: Partial<typeof header>) =>
    update((r) => {
      const next = { ...header, ...patch };
      const tabHeaders = { ...(r.detail.tabHeaders ?? {}) };
      // Everything empty is the default banner: keep nothing.
      if (!next.label.trim() && !next.heading.trim() && !next.icon) delete tabHeaders[tab];
      else tabHeaders[tab] = next;
      return { ...r, detail: { ...r.detail, tabHeaders } };
    });

  const change = (next: RichTextDoc) =>
    update((r) => {
      const tabs = { ...r.detail.tabs };
      // An editor that was opened and closed without typing is an empty document: drop it.
      if (isRichTextEmpty(next)) delete tabs[tab];
      else tabs[tab] = next;
      return { ...r, detail: { ...r.detail, tabs } };
    });

  return (
    <div className="space-y-5">
      {/* The banner at the top of this tab on the public page. Left empty, the default wording and icon are used. */}
      <Card title="Page header" description="The banner at the top of this tab: its small label, its heading and its icon. Leave a field empty to use the default.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput id={`${tab}-hdr-label`} label="Label" max={40} value={header.label} onChange={(v) => setHeader({ label: v })} placeholder={title} hint="The small line above the heading." />
          <TextInput
            id={`${tab}-hdr-heading`}
            label="Heading"
            max={140}
            value={header.heading}
            onChange={(v) => setHeader({ heading: v })}
            placeholder={`Everything about ${(header.label.trim() || title).toLowerCase()} at ${record.name || "this college"}`}
            hint="The large line. Empty: the wording shown here."
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-ink">Icon</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {Object.entries(TAB_ICONS).map(([key, { label, Icon }]) => {
              const on = shownIcon === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    title={label}
                    onClick={() => setHeader({ icon: key === (DEFAULT_TAB_ICON[tab] ?? "grad") && !header.icon ? "" : key })}
                    className={`grid h-10 w-10 place-items-center rounded-xl border transition ${on ? "border-brand bg-brand text-white" : "border-line text-ink-soft hover:border-brand hover:text-brand"}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {header.icon && (
            <button type="button" onClick={() => setHeader({ icon: "" })} className="mt-2 text-xs font-medium text-brand hover:underline">
              Use the default icon
            </button>
          )}
        </div>
      </Card>

      <Card title={title} description={description}>
        <RichTextField label={title} value={doc} onChange={change} minHeight={320} hint="Headings, lists, links and tables are available in the toolbar. Left empty, the tab shows an empty message." />
      </Card>
    </div>
  );
}

const TITLE_MAX = 70;
// The address the site is served from, so the preview reads like the real search result.
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "topcollegepath.com";
const DESC_MAX = 170;

export function SeoTab({ record, update, slug }: EditorProps) {
  const seo = record.detail.seo;
  const set = (patch: Partial<typeof seo>) => update((r) => ({ ...r, detail: { ...r.detail, seo: { ...r.detail.seo, ...patch } } }));
  const shownTitle = seo.metaTitle.trim() || `${record.name}: Courses, Fees, Admission & Placements`;
  const shownDescription = seo.metaDescription.trim() || (record.about ? `${record.about.slice(0, DESC_MAX - 1)}…` : "");

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card title="Search result text" description="How the college appears in Google. Left empty, the site writes a title and uses the start of the About text.">
        <TextInput id="seo-title" label="Meta title" max={TITLE_MAX} value={seo.metaTitle} onChange={(v) => set({ metaTitle: v })} hint="Under about 60 characters shows in full." />
        <TextArea id="seo-desc" label="Meta description" rows={4} max={DESC_MAX} value={seo.metaDescription} onChange={(v) => set({ metaDescription: v })} hint="One or two sentences." />
      </Card>
      <Card title="Preview">
        <div className="rounded-lg border border-line bg-bg p-4">
          <p className="truncate text-xs text-ink-faint">{SITE_HOST} › college › {slug}</p>
          <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{shownTitle}</p>
          <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{shownDescription || "No description."}</p>
        </div>
        {seo.metaTitle.length > 60 && <p className="text-xs text-amber-800">The title is long and may be cut off in search results.</p>}
      </Card>
    </div>
  );
}
