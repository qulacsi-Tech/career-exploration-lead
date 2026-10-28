"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { isOn, toggleHref, withoutFilters, type FilterGroup } from "@/components/colleges/filter-utils";

/**
 * The listing's filter column: one grey accordion per facet, with the sort
 * choice leading, as in the reference layout.
 *
 * Each option is a plain link that sets (or clears) one URL parameter, so the
 * server page stays the single source of truth for results, the URL is
 * shareable, and the filters work before hydration. Facets are single-select
 * because the API filters on one value per field.
 */
function Accordion({
  label,
  hint,
  defaultOpen,
  children,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-bg-alt px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-brand-soft/60"
      >
        <span>
          {label}
          {hint && <span className="ml-1 font-medium text-brand">({hint})</span>}
        </span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-faint">
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="border-t border-line-soft px-3 py-3">{children}</div>}
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
        on ? "border-brand bg-brand" : "border-line bg-surface"
      }`}
    >
      {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
  );
}

function OptionLink({ href, on, onPick, children }: { href: string; on: boolean; onPick?: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onPick}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
        on ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink-soft hover:bg-bg-alt"
      }`}
    >
      <Radio on={on} />
      {children}
    </Link>
  );
}

export function ListingFilters({
  groups,
  sorts,
  sort,
  replacePreset = false,
}: {
  /** The first pick replaces the filters the page was opened with. */
  replacePreset?: boolean;
  groups: FilterGroup[];
  /** Omit for a list with no sort choice. */
  sorts?: { key: string; label: string }[];
  sort?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  // A page opened from the header menu arrives with its own filter already on. The first pick the visitor
  // makes replaces it instead of adding to it (which would often match nothing); picks after that add up.
  // `picked` is the address that first pick led to, so opening any other address starts over.
  const [picked, setPicked] = useState<string | null>(null);
  const here = search.toString() ? `${pathname}?${search.toString()}` : pathname;
  const hasPicked = picked === here;
  const sortLabel = sorts?.find((s) => s.key === sort)?.label ?? sorts?.[0]?.label;

  const sortHref = (key: string) => {
    const next = new URLSearchParams(search.toString());
    next.delete("page");
    next.set("sort", key);
    return `${pathname}?${next.toString()}`;
  };

  const hrefFor = (group: FilterGroup, opt: FilterGroup["options"][number]) => {
    const current = new URLSearchParams(search.toString());
    const fresh = !replacePreset || hasPicked || isOn(opt, (k) => current.get(k)) ? current : withoutFilters(groups, current);
    return toggleHref(pathname, fresh, group, opt);
  };

  return (
    <div className="space-y-2.5">
      {sorts && (
        <Accordion label={`Sort by: ${sortLabel}`}>
          <ul className="space-y-1">
            {sorts.map((s) => (
              <li key={s.key}>
                <OptionLink href={sortHref(s.key)} on={(sort ?? sorts[0].key) === s.key}>
                  {s.label}
                </OptionLink>
              </li>
            ))}
          </ul>
        </Accordion>
      )}

      {groups.map((group) => {
        const selected = group.options.some((o) => isOn(o, (k) => search.get(k)));
        return (
          <Accordion
            key={group.id}
            label={group.label}
            hint={selected ? "1 selected" : undefined}
            defaultOpen={selected}
          >
            <ul className="space-y-1">
              {group.options.map((opt) => (
                <li key={opt.label}>
                  <OptionLink
                    href={hrefFor(group, opt)}
                    on={isOn(opt, (k) => search.get(k))}
                    onPick={() => setPicked(hrefFor(group, opt))}
                  >
                    {opt.label}
                  </OptionLink>
                </li>
              ))}
            </ul>
          </Accordion>
        );
      })}
    </div>
  );
}
