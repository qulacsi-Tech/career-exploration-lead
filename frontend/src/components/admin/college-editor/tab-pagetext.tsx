"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PAGE_TEXT, PAGE_TEXT_GROUPS, usualText } from "@/lib/page-text";
import type { EditorProps } from "@/components/admin/college-editor/tab-info";
import { Card } from "@/components/admin/college-editor/shared";

/**
 * Every heading and description on this college's pages, grouped by the tab it is on. Each shows the usual wording
 * as a hint; type something to replace it, empty it to go back to the usual one. `{name}`, `{short}` and `{stream}`
 * are filled in with the college's name, short name and category. Saved with the Save button.
 */
export function PageTextTab({ record, update }: EditorProps) {
  const written = record.detail.pageText ?? {};
  const [open, setOpen] = useState<string | null>(PAGE_TEXT_GROUPS[0]);
  const [query, setQuery] = useState("");
  const college = { name: record.name || "This college", shortName: record.detail.shortName, stream: record.streams[0] ?? "" };

  const set = (key: string, value: string) =>
    update((r) => {
      const next = { ...(r.detail.pageText ?? {}) };
      if (value.trim()) next[key] = value;
      else delete next[key];
      return { ...r, detail: { ...r.detail, pageText: next } };
    });

  const needle = query.trim().toLowerCase();
  const fields = useMemo(() => PAGE_TEXT.filter((f) => !needle || `${f.label} ${f.group} ${usualText(f.key, college)}`.toLowerCase().includes(needle)), [needle, record.name, record.detail.shortName]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card
      title="Page text"
      description="Reword any heading or description on the college's pages. The grey text is what the page says now; type to replace it, or empty the box to go back to it. You can use {name}, {short} and {stream}."
    >
      <label className="relative block">
        <span className="sr-only">Search the page text</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a heading or description" className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" />
      </label>

      <div className="space-y-3">
        {PAGE_TEXT_GROUPS.map((group) => {
          const inGroup = fields.filter((f) => f.group === group);
          if (inGroup.length === 0) return null;
          const changed = PAGE_TEXT.filter((f) => f.group === group && written[f.key]?.trim()).length;
          const isOpen = needle ? true : open === group;
          return (
            <section key={group} className="rounded-xl border border-line bg-surface">
              <button type="button" onClick={() => setOpen(isOpen && !needle ? null : group)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-semibold text-ink">{group}</span>
                <span className="flex items-center gap-3 text-xs text-ink-faint">
                  {changed > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">{changed} changed</span>}
                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-4 border-t border-line px-4 py-4">
                  {inGroup.map((f) => {
                    const value = written[f.key] ?? "";
                    const long = f.kind === "description";
                    const common = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
                    return (
                      <div key={f.key}>
                        <div className="flex items-center justify-between gap-3">
                          <label htmlFor={`pt-${f.key}`} className="text-xs font-semibold text-ink">{f.label}</label>
                          {value && <button type="button" onClick={() => set(f.key, "")} className="text-xs font-medium text-brand hover:underline">Use the usual wording</button>}
                        </div>
                        {long ? (
                          <textarea id={`pt-${f.key}`} rows={2} maxLength={400} value={value} onChange={(e) => set(f.key, e.target.value)} placeholder={usualText(f.key, college)} className={common} />
                        ) : (
                          <input id={`pt-${f.key}`} maxLength={200} value={value} onChange={(e) => set(f.key, e.target.value)} placeholder={usualText(f.key, college)} className={common} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {fields.length === 0 && <p className="text-sm text-ink-soft">Nothing matches “{query}”.</p>}
      </div>
    </Card>
  );
}
