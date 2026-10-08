"use client";

import { useState, type ReactNode } from "react";
import { DateField } from "@/components/admin/date-field";

/*
  The small parts every tab of the college editor is built from: a card, labelled fields,
  chips with suggestions from the directory, a row with Up / Down / Remove, and a date field
  that works in the ISO form the API stores.
*/

export const inputCls =
  "mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

/** A titled card, the unit a tab is made of. */
export function Card({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          {description && <p className="mt-1 max-w-3xl text-xs text-ink-faint">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

/** A label above a control, with the usual required star and hint. */
export function Labelled({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  max,
  required,
  hint,
  placeholder,
  type = "text",
  list,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  type?: string;
  list?: string;
}) {
  return (
    <Labelled id={id} label={label} required={required} hint={[hint, max ? `${value.length}/${max}` : ""].filter(Boolean).join(" ")}>
      <input id={id} type={type} list={list} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </Labelled>
  );
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  max,
  required,
  hint,
  rows = 4,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  hint?: string;
  rows?: number;
}) {
  return (
    <Labelled id={id} label={label} required={required} hint={[hint, `${value.length}/${max}`].filter(Boolean).join(" ")}>
      <textarea id={id} rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </Labelled>
  );
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  required,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Labelled id={id} label={label} required={required} hint={hint}>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value === "") return onChange(null);
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className={inputCls}
      />
    </Labelled>
  );
}

export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  // A value saved under a name that is no longer in the list stays selectable.
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Labelled id={id} label={label} required={required} hint={hint}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {all.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Labelled>
  );
}

/** Tags typed in (Enter or a comma adds one), with the directory's existing ones offered as you type. */
export function ChipInput({
  id,
  label,
  value,
  onChange,
  suggestions = [],
  max,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  max?: number;
  hint?: string;
  placeholder?: string;
}) {
  const [typed, setTyped] = useState("");
  const full = max !== undefined && value.length >= max;
  const has = (text: string) => value.some((v) => v.toLowerCase() === text.toLowerCase());

  const add = (raw: string) => {
    const text = raw.trim();
    setTyped("");
    if (!text || full || has(text)) return;
    // Typing "aicte" reuses the existing "AICTE".
    onChange([...value, suggestions.find((s) => s.toLowerCase() === text.toLowerCase()) ?? text]);
  };

  const listId = `${id}-list`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label} {max !== undefined && <span className="font-normal text-ink-soft">({value.length} of {max})</span>}
      </label>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-alt py-1 pl-3 pr-1.5 text-sm text-ink">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-700">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex max-w-xl gap-2">
        <input
          id={id}
          list={listId}
          value={typed}
          disabled={full}
          placeholder={full ? `Up to ${max}` : placeholder ?? "Type and press Enter"}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(typed);
            }
          }}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none disabled:opacity-60"
        />
        <datalist id={listId}>
          {suggestions.filter((s) => !has(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="button" onClick={() => add(typed)} disabled={!typed.trim() || full} className="shrink-0 rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
          Add
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/** One row of a repeating list: a heading, Up / Down / Remove, and the row's fields. */
export function Row({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
  error,
}: {
  title: string;
  index: number;
  count: number;
  onMove?: (direction: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <li className={`rounded-xl border bg-bg-alt/50 p-4 ${error ? "border-red-300" : "border-line"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <div className="flex items-center gap-2">
          {onMove && (
            <>
              <button type="button" aria-label={`Move ${title} up`} disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Up</button>
              <button type="button" aria-label={`Move ${title} down`} disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft hover:border-brand disabled:opacity-40">Down</button>
            </>
          )}
          <button type="button" onClick={onRemove} className="rounded-lg border border-line px-3 py-1 text-xs text-ink-soft hover:border-red-700 hover:text-red-700">Remove</button>
        </div>
      </div>
      {children}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </li>
  );
}

export const AddButton = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-40">
    {children}
  </button>
);

export const EmptyNote = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">{children}</p>
);

export function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// ── Dates: the API stores YYYY-MM-DD; the picker works in "26 Mar 2027" ──────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isoToText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function textToIso(text: string): string {
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(text.trim());
  const month = m ? MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}` : "";
}

export function IsoDate({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (iso: string) => void; hint?: string }) {
  return <DateField id={id} label={label} value={isoToText(value)} onChange={(text) => onChange(textToIso(text))} hint={hint} />;
}

export const today = () => new Date().toISOString().slice(0, 10);
