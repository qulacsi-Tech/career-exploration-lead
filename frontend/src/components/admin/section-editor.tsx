"use client";

import { ReactNode, useState } from "react";
import { TextField, TextAreaField } from "@/components/admin/admin-fields";

/**
 * Editor for one section of a public page: its copy, whether it shows, and the
 * order of the items inside it.
 *
 * Every homepage section is the same shape — a heading, a line of supporting
 * copy, and usually a list — so this is written once and configured per
 * section rather than repeated nine times.
 */

export type SectionItem = {
  id: string;
  label: string;
  /** Secondary line: a location's college count, an exam's date. */
  meta?: string;
};

export function SectionEditor({
  name,
  heading,
  subheading,
  headingLabel = "Section heading",
  subheadingLabel = "Supporting text",
  visible = true,
  items,
  itemsTitle = "Items",
  itemsHint,
  featuring = false,
  featuringDefault = "top",
  featuringCount = 6,
  children,
}: {
  /** Prefix for field names, so two sections on one page do not collide. */
  name: string;
  heading: string;
  subheading?: string;
  headingLabel?: string;
  subheadingLabel?: string;
  visible?: boolean;
  items?: SectionItem[];
  itemsTitle?: string;
  itemsHint?: string;
  /** Adds the featuring mode control above the item list. */
  featuring?: boolean;
  featuringDefault?: FeaturingMode;
  featuringCount?: number;
  /** Section-specific fields, rendered under the shared copy fields. */
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label={headingLabel}
          name={`${name}-heading`}
          defaultValue={heading}
          className="sm:col-span-2"
        />
        <VisibilityToggle name={`${name}-visible`} defaultChecked={visible} />
        {subheading !== undefined && (
          <TextAreaField
            label={subheadingLabel}
            name={`${name}-subheading`}
            rows={2}
            defaultValue={subheading}
            className="sm:col-span-2 lg:col-span-3"
          />
        )}
        {children}
      </div>

      {featuring && (
        <FeaturingModeField
          name={name}
          defaultMode={featuringDefault}
          count={featuringCount}
          total={items?.length ?? 0}
        />
      )}

      {items && <OrderableList name={name} title={itemsTitle} hint={itemsHint} items={items} />}
    </div>
  );
}

export type FeaturingMode = "top" | "shuffle";

/**
 * How the section picks which items to feature. Radio rather than two
 * checkboxes: the two modes are mutually exclusive, and a radio group enforces
 * that in the markup instead of relying on a handler to uncheck the other one.
 */
function FeaturingModeField({
  name,
  defaultMode,
  count,
  total,
}: {
  name: string;
  defaultMode: FeaturingMode;
  count: number;
  total: number;
}) {
  const [mode, setMode] = useState<FeaturingMode>(defaultMode);

  const options: { value: FeaturingMode; title: string; description: string }[] = [
    {
      value: "top",
      title: `Top ${count}`,
      description:
        total > 0
          ? `The first ${count} of the ${total} items below are featured. Reorder the list to change which.`
          : `The first ${count} items in the list below are featured.`,
    },
    {
      value: "shuffle",
      title: "Shuffle daily",
      description: `A different ${count} picked each day from the whole list. Order below is ignored.`,
    },
  ];

  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-wide text-ink-faint">
        Featuring
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = mode === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                selected ? "border-brand bg-brand-soft/40" : "border-line hover:border-brand/50"
              }`}
            >
              <input
                type="radio"
                name={`${name}-featuring`}
                value={option.value}
                checked={selected}
                onChange={() => setMode(option.value)}
                className="mt-0.5 h-4 w-4 shrink-0 border-line text-brand focus:ring-brand"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.title}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {mode === "shuffle" && (
        <p className="mt-2 text-[11px] text-ink-faint">
          The rotation has to be seeded by date on the server so every visitor sees
          the same set on a given day — a random pick made in the browser would
          differ from the server-rendered page.
        </p>
      )}
    </fieldset>
  );
}

function VisibilityToggle({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-ink">Visibility</span>
      <label className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
        />
        <span className="text-sm text-ink-soft">Show this section</span>
      </label>
    </div>
  );
}

/**
 * Reordering by up/down buttons rather than drag-and-drop.
 *
 * Deliberate: dragging needs a library, breaks on touch without extra work, and
 * is unusable by keyboard. Buttons work everywhere and the lists here are short.
 * The position number is shown so an editor can see the running order at a
 * glance instead of counting rows.
 */
function OrderableList({
  name,
  title,
  hint,
  items,
}: {
  name: string;
  title: string;
  hint?: string;
  items: SectionItem[];
}) {
  const [order, setOrder] = useState(items);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h3>
        <span className="text-[11px] text-ink-faint">{order.length} items</span>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}

      <ul className="mt-3 space-y-2">
        {order.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-alt text-xs font-semibold text-ink-soft">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{item.label}</p>
              {item.meta && <p className="truncate text-xs text-ink-faint">{item.meta}</p>}
            </div>

            {/* Order is submitted as a hidden field; the buttons only reorder. */}
            <input type="hidden" name={`${name}-order`} value={item.id} />

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${item.label} up`}
                className="rounded-md border border-line p-1.5 text-ink-faint transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-faint"
              >
                <ArrowIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move ${item.label} down`}
                className="rounded-md border border-line p-1.5 text-ink-faint transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-faint"
              >
                <ArrowIcon className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M10 15V5m0 0L5.5 9.5M10 5l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
