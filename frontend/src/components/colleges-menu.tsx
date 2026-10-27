"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Building2, FolderOpen, ChevronDown, LayoutGrid, ChevronRight, ClipboardList, GraduationCap, Laptop, Layers, MapPin, Sparkles, Trophy, X,
  type LucideIcon,
} from "lucide-react";

/** One column-one entry of the menu ("Popular Courses") and the listing links under it. */
export type MenuLink = { label: string; href: string };
export type MenuGroup = { label: string; icon?: string; items: (MenuLink & { children?: MenuLink[] })[] };

const ICONS: Record<string, LucideIcon> = {
  ranking: Trophy, course: GraduationCap, specialisation: Sparkles, location: MapPin,
  type: Building2, level: Layers, mode: Laptop, exam: ClipboardList, collection: FolderOpen, category: LayoutGrid,
};

/**
 * The "Top Ranked Colleges" menu, after Shiksha's: categories down the left, and the links for the
 * one pointed at on the right. Every link opens /colleges with that filter already picked, so the
 * other filters can still be added there. The panel hangs off the sticky <header>.
 */
export function CollegesMenu({ label, href, groups }: { label: string; href: string; groups: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // A click anywhere outside the menu closes it, so opening the other menu never leaves this one showing.
    const onPointerDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (groups.length === 0) {
    return <Link href={href} className="hover:text-brand">{label}</Link>;
  }

  const group = groups[Math.min(active, groups.length - 1)];

  return (
    <div ref={wrap}>
      {/* Opens on click and stays open until it is closed with the cross (or Escape, or a link is followed). */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 py-2 hover:text-brand ${open ? "text-brand" : ""}`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="tcp-menu-panel absolute inset-x-0 top-full overflow-hidden border-b border-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/50 shadow-[0_24px_40px_-20px_rgba(123,26,42,0.35)]">
          <span aria-hidden className="tcp-float-slow pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-soft/80 blur-2xl" />
          <span aria-hidden className="tcp-float pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-brand-soft/80 blur-2xl" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-4 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-sm transition hover:border-brand hover:text-brand sm:right-6 lg:right-8"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="relative mx-auto grid max-w-6xl grid-cols-[18rem_minmax(0,1fr)] px-4 sm:px-6 lg:px-8">
            <ul className="space-y-1 border-r border-line/70 py-4 pr-4">
              {groups.map((g, i) => {
                const Icon = ICONS[g.icon ?? ""] ?? Sparkles;
                const on = i === active;
                return (
                  <li key={g.label}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className={`group/cat flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition duration-200 ${
                        on
                          ? "translate-x-1 bg-gradient-to-r from-brand to-brand-dark font-semibold text-white shadow-md"
                          : "text-ink-soft hover:translate-x-0.5 hover:bg-surface hover:text-brand-ink hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition duration-300 ${
                          on ? "rotate-6 bg-white/20" : "bg-brand-soft text-brand group-hover/cat:-rotate-6"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1">{g.label}</span>
                      <ChevronRight className={`h-4 w-4 transition ${on ? "translate-x-0.5" : "opacity-40"}`} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Faint grid lines behind the links, fading out towards the edges. */}
            <div className="tcp-menu-grid relative max-h-[27rem] overflow-y-auto px-8 py-5">
              <div key={group.label}>
                <div className="tcp-menu-item mb-4 flex items-center gap-3" style={{ "--i": 0 } as React.CSSProperties}>
                  <h3 className="font-display text-xl font-extrabold text-brand-ink">{group.label}</h3>
                  <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-gold">{group.items.length}</span>
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-brand/30 to-transparent" />
                </div>

                <ul className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                  {group.items.map((item, i) => (
                    <li key={item.href} className="tcp-menu-item" style={{ "--i": i + 1 } as React.CSSProperties}>
                      {item.children ? (
                        // A link with others under it (a course and its specialisations): the link, then the ones beneath it.
                        <div className="rounded-xl border border-line bg-surface/90 px-3.5 py-2.5">
                          <Link href={item.href} onClick={() => setOpen(false)} className="group/link flex items-center justify-between gap-2 text-sm font-bold text-brand-ink transition hover:text-brand">
                            <span className="truncate">{item.label}</span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-brand opacity-0 transition group-hover/link:opacity-100" aria-hidden="true" />
                          </Link>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link href={child.href} onClick={() => setOpen(false)} className="inline-flex rounded-full border border-brand/30 bg-brand-soft/60 px-2.5 py-1 text-xs font-semibold text-brand-ink transition hover:border-brand hover:bg-brand hover:text-white">
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group/link flex items-center justify-between gap-2 rounded-xl border border-line bg-surface/90 px-3.5 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-brand-soft hover:text-brand-ink hover:shadow-[0_8px_18px_-10px_rgba(177,36,62,0.5)]"
                      >
                        <span className="truncate">{item.label}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-1 text-brand opacity-0 transition duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden="true" />
                      </Link>
                      )}
                    </li>
                  ))}
                </ul>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
