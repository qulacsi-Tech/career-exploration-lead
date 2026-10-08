"use client";

import { RichTextField } from "@/components/admin/rich-text-editor";
import { isRichTextEmpty, type RichTextDoc } from "@/lib/rich-text";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { Card, TextArea, TextInput } from "@/components/admin/college-editor/shared";

/*
  The written sections of the college page (Admissions, Infrastructure, Scholarships), each a
  rich-text document, and the SEO text. A section left empty makes the page show an empty
  message instead of a blank tab.
*/

export function WrittenTab({ record, update, tab, title, description }: EditorProps & { tab: string; title: string; description: string }) {
  const doc = record.detail.tabs[tab];

  const change = (next: RichTextDoc) =>
    update((r) => {
      const tabs = { ...r.detail.tabs };
      // An editor that was opened and closed without typing is an empty document: drop it.
      if (isRichTextEmpty(next)) delete tabs[tab];
      else tabs[tab] = next;
      return { ...r, detail: { ...r.detail, tabs } };
    });

  return (
    <Card title={title} description={description}>
      <RichTextField label={title} value={doc} onChange={change} minHeight={320} hint="Headings, lists, links and tables are available in the toolbar. Left empty, the tab shows an empty message." />
    </Card>
  );
}

const TITLE_MAX = 70;
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
          <p className="truncate text-xs text-ink-faint">yoursite.com › college › {slug}</p>
          <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{shownTitle}</p>
          <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{shownDescription || "No description."}</p>
        </div>
        {seo.metaTitle.length > 60 && <p className="text-xs text-amber-800">The title is long and may be cut off in search results.</p>}
      </Card>
    </div>
  );
}
