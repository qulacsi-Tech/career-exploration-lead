"use client";

import { useState } from "react";
import { Search } from "lucide-react";

/**
 * The Admissions text one section at a time. A long page of eligibility, dates and documents for several
 * courses is hard to read in one go, so the visitor can pick the course (or topic) they care about, or
 * search the text. The sections are cut at the document's headings on the server and arrive here already
 * as HTML, so what is shown is exactly what the editor wrote.
 */
export type AdmissionSection = { id: string; title: string; html: string; text: string };

export function AdmissionSections({ sections }: { sections: AdmissionSection[] }) {
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const shown = sections.filter((s) => (active === "all" || s.id === active) && (!q || `${s.title} ${s.text}`.toLowerCase().includes(q)));

  return (
    <div>
      <div className="mb-6 space-y-3 rounded-2xl border border-line bg-bg-alt/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the admission details"
            aria-label="Search the admission details"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div role="tablist" aria-label="Admission details by course" className="flex flex-wrap gap-2">
          {[{ id: "all", title: "All" }, ...sections].map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active === s.id}
              onClick={() => setActive(s.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active === s.id ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">Nothing matches &ldquo;{query}&rdquo;. Clear the search or choose another course.</p>
      ) : (
        <div className="space-y-8">
          {shown.map((s) => (
            <div key={s.id} className="rich-text max-w-3xl" dangerouslySetInnerHTML={{ __html: s.html }} />
          ))}
        </div>
      )}
    </div>
  );
}
