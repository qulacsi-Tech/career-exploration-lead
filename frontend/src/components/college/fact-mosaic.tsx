"use client";

import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  MapPin,
  ScrollText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CountUp, RevealGroup, RevealItem } from "@/components/college/reveal";

/**
 * The institution's identity as a bento grid.
 *
 * These facts used to live in a "Quick Facts" definition list in the sidebar —
 * four rows of label-and-value that a visitor's eye slid straight past on the
 * way to the callback form. Moved here they are the second half of the
 * Overview story: the paragraph says what the college is, the mosaic says what
 * it is made of.
 *
 * Moving them also removed a duplication. Established, ownership and fees were
 * in the sidebar *and* implied by the hero; the sidebar now holds only the two
 * things it should — the callback form and the contact details.
 *
 * ## Why tiles are different sizes
 *
 * A uniform six-up grid gives every fact the same weight, which is false: how
 * many programmes a college runs and which accreditations it holds are what a
 * visitor is actually weighing, and the year it was founded is context. The
 * `span` on an item is that judgement made visible.
 *
 * ## Icons crossing the server boundary
 *
 * The page is a server component, and a Lucide component cannot be passed
 * through it as a prop — only serializable values cross. So items name their
 * icon as a string and the map below resolves it on the client.
 */

const ICONS = {
  calendar: CalendarDays,
  building: Building2,
  book: BookOpen,
  wallet: Wallet,
  scroll: ScrollText,
  award: Award,
  map: MapPin,
} satisfies Record<string, LucideIcon>;

export type FactItem = {
  icon: keyof typeof ICONS;
  label: string;
  /** Counted up when a number, rendered verbatim when a string. */
  value: string | number;
  /** Quieter line under the value — the unit, the derivation, the detail. */
  note?: string;
  /** Chips under the note, for facts that are really a list. */
  chips?: string[];
  /** Tiles worth more room say so. Two columns on sm and up. */
  wide?: boolean;
  /** One tile per grid carries the brand ground, as the anchor. */
  accent?: boolean;
};

export function FactMosaic({ items }: { items: FactItem[] }) {
  return (
    <RevealGroup className="grid gap-4 sm:grid-cols-2" stagger={0.07}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];

        return (
          <RevealItem key={item.label} className={item.wide ? "sm:col-span-2" : ""}>
            <article
              className={`group relative h-full overflow-hidden rounded-3xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${
                item.accent
                  ? "border-brand/30 bg-brand-soft hover:border-brand/50"
                  : "border-line bg-surface hover:border-brand/40"
              }`}
            >
              {/* A quarter-circle that swells out of the corner on hover. It is
                  the same shape language as the backdrop field, so the tiles
                  feel cut from the section rather than dropped onto it. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[2.6] ${
                  item.accent ? "bg-brand/10" : "bg-brand-soft/60"
                }`}
              />

              <div className="relative">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${
                    item.accent ? "bg-brand text-white" : "bg-brand-soft text-brand"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <p
                  className={`mt-5 text-[11px] font-bold uppercase tracking-[0.18em] ${
                    item.accent ? "text-brand-ink/70" : "text-ink-faint"
                  }`}
                >
                  {item.label}
                </p>

                <p
                  className={`mt-1.5 font-display text-2xl font-extrabold ${
                    item.accent ? "text-brand-ink" : "text-ink"
                  }`}
                >
                  {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                </p>

                {item.note && (
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      item.accent ? "text-brand-ink/80" : "text-ink-soft"
                    }`}
                  >
                    {item.note}
                  </p>
                )}

                {item.chips && item.chips.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {item.chips.map((chip) => (
                      <li
                        key={chip}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          item.accent
                            ? "border-brand/30 bg-white/60 text-brand-ink"
                            : "border-line bg-bg-alt text-ink-soft"
                        }`}
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
