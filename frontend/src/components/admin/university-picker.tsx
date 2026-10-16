"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type UniversityOption = { slug: string; name: string; city: string };

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * A searchable list of the directory's colleges, for choosing a programme's
 * university. Picking one fills both `universityName` and `universitySlug`, so
 * the programme links to that college's page. Typing a name that is not in the
 * directory still works: the slug is made from the text and the programme does
 * not link to a college page.
 */
export function UniversityPicker({
  colleges,
  defaultName = "",
  defaultSlug = "",
  onNameChange,
}: {
  colleges: UniversityOption[];
  defaultName?: string;
  defaultSlug?: string;
  /** Called with the university name whenever it changes, so a form can build a slug from it. */
  onNameChange?: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? colleges.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q)) : colleges;
    return list.slice(0, 50);
  }, [colleges, query]);

  const linked = colleges.some((c) => c.slug === slug);

  const pick = (c: UniversityOption) => {
    setName(c.name);
    setSlug(c.slug);
    onNameChange?.(c.name);
    setQuery("");
    setOpen(false);
  };

  const chooseTyped = () => {
    const typed = query.trim();
    // A name with no English letters has no slug; the editor picks from the list instead.
    if (!typed || !slugify(typed)) return;
    setName(typed);
    setSlug(slugify(typed));
    onNameChange?.(typed);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={box} className="relative sm:col-span-2">
      <label htmlFor="university-search" className="block text-xs font-semibold text-ink">
        University <span className="text-brand">*</span>
      </label>
      <input type="hidden" name="universityName" value={name} />
      <input type="hidden" name="universitySlug" value={slug} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-left text-sm text-ink focus:border-brand focus:outline-none"
      >
        <span className={name ? "truncate" : "text-ink-faint"}>{name || "Choose a university"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="mt-1 text-xs text-ink-faint">
        {!name
          ? "Search the directory's colleges, or type a new name."
          : linked
            ? "Linked to the college's page."
            : "Not in the directory, so it will not link to a college page."}
      </p>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              id="university-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter must not submit the programme form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (matches[0]) pick(matches[0]);
                  else chooseTyped();
                }
              }}
              placeholder="Search colleges"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {matches.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.slug === slug}
                  onClick={() => pick(c)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-ink-faint">{c.city}</span>
                  </span>
                  {c.slug === slug && <Check className="h-4 w-4 shrink-0 text-brand" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-3 text-sm text-ink-soft">No college matches.</li>}
            {query.trim() && (
              <li className="border-t border-line-soft">
                <button
                  type="button"
                  onClick={chooseTyped}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-brand hover:bg-brand-soft"
                >
                  Use &ldquo;{query.trim()}&rdquo; as a new university
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
