"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Building2, ChevronDown, ChevronRight, ClipboardList, GraduationCap, Laptop, Layers, MapPin, Sparkles, Trophy,
  type LucideIcon,
} from "lucide-react";

/** One column-one entry of the menu ("Popular Courses") and the listing links under it. */
export type MenuGroup = { label: string; icon?: string; items: { label: string; href: string }[] };

const ICONS: Record<string, LucideIcon> = {
  ranking: Trophy, course: GraduationCap, specialisation: Sparkles, location: MapPin,
  type: Building2, level: Layers, mode: Laptop, exam: ClipboardList,
};

/**
 * The "Top Ranked Colleges" menu, after Shiksha's: categories down the left, and the links for the
 * one pointed at on the right. Every link opens /colleges with that filter already picked, so the
 * other filters can still be added there. The panel hangs off the sticky <header>.
 */
export function CollegesMenu({ label, href, groups }: { label: string; href: string; groups: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  // A short delay lets the pointer cross the gap between the link and the panel.
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (groups.length === 0) {
    return <Link href={href} className="hover:text-brand">{label}</Link>;
  }

  const group = groups[Math.min(active, groups.length - 1)];

  return (
    <div onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <Link
        href={href}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(false)}
        className={`inline-flex items-center gap-1 py-2 hover:text-brand ${open ? "text-brand" : ""}`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </Link>

      {open && (
        <div className="tcp-menu-panel absolute inset-x-0 top-full overflow-hidden border-b border-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/50 shadow-[0_24px_40px_-20px_rgba(123,26,42,0.35)]">
          <span aria-hidden className="tcp-float-slow pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-soft/80 blur-2xl" />
          <span aria-hidden className="tcp-float pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-brand-soft/80 blur-2xl" />

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
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group/link flex items-center justify-between gap-2 rounded-xl border border-line bg-surface/90 px-3.5 py-2.5 text-sm font-medium text-ink transition duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-brand-soft hover:text-brand-ink hover:shadow-[0_8px_18px_-10px_rgba(177,36,62,0.5)]"
                      >
                        <span className="truncate">{item.label}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-1 text-brand opacity-0 transition duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="tcp-wiggle mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark hover:shadow-md"
                >
                  View all colleges <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
