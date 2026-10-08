"use client";

import { useState } from "react";

/*
  A money range chosen with number inputs and a unit picker, in place of a text box.

  The site shows a range as short text such as "₹7.0 - 18 LPA", and these fields are stored
  that way, so the two numbers and the unit are joined into that text on every change and read
  back from it. A value that is not in that shape (an older, hand-typed entry) cannot be split
  into numbers: it is shown as it is, with a note, until a range is entered or it is cleared.
  The field stays empty until both numbers are filled in and the first is not above the second.
*/

const PATTERN = /^\s*(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+)?\s*\.?\s*$/i;

// "₹4.2L - 9.6L": the unit after each number.
const COMPACT = /^\s*(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+)?\s*(?:-|–|—|to)\s*(?:₹)?\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+)?\s*(?:total fees)?\s*\.?\s*$/i;

function parse(value: string, units: string[], compact: boolean) {
  if (compact) {
    const c = COMPACT.exec(value);
    if (!c) return null;
    const unit = units.find((u) => u.toLowerCase() === (c[4] ?? c[2] ?? units[0]).toLowerCase());
    return unit ? { min: c[1], max: c[3], unit } : null;
  }
  const m = PATTERN.exec(value);
  if (!m) return null;
  const unit = units.find((u) => u.toLowerCase() === (m[3] ?? units[0]).toLowerCase());
  return unit ? { min: m[1], max: m[2], unit } : null;
}

export function RangeField({
  id,
  label,
  value,
  onChange,
  units,
  hint,
  compact = false,
}: {
  id: string;
  label: string;
  /** The range as text, e.g. "₹7.0 - 18 LPA". Empty: none. */
  value: string;
  onChange: (next: string) => void;
  /** The units to choose from, such as ["LPA"]. The first is the default. */
  units: string[];
  hint?: string;
  /** Write the unit after each number ("₹4.2L - 9.6L") instead of once at the end. */
  compact?: boolean;
}) {
  const initial = parse(value, units, compact);
  const [min, setMin] = useState(initial?.min ?? "");
  const [max, setMax] = useState(initial?.max ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? units[0]);
  // An existing value that does not fit the shape stays as it is until the admin sets a range.
  const [loose, setLoose] = useState(value.trim() !== "" && initial === null);

  const emit = (nextMin: string, nextMax: string, nextUnit: string) => {
    setLoose(false);
    const lo = Number(nextMin);
    const hi = Number(nextMax);
    const ok = nextMin !== "" && nextMax !== "" && Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi;
    onChange(ok ? (compact ? `₹${nextMin}${nextUnit} - ${nextMax}${nextUnit}` : `₹${nextMin} - ${nextMax} ${nextUnit}`) : "");
  };

  const inverted = min !== "" && max !== "" && Number(min) > Number(max);
  const field = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

  return (
    <div>
      <label htmlFor={`${id}-min`} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2" role="group" aria-label={label}>
        <span className="text-sm text-ink-soft" aria-hidden="true">₹</span>
        <input
          id={`${id}-min`}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={min}
          placeholder="From"
          aria-label={`${label}: from`}
          onChange={(e) => {
            setMin(e.target.value);
            emit(e.target.value, max, unit);
          }}
          className={field}
        />
        <span className="text-sm text-ink-soft" aria-hidden="true">to</span>
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={max}
          placeholder="To"
          aria-label={`${label}: to`}
          onChange={(e) => {
            setMax(e.target.value);
            emit(min, e.target.value, unit);
          }}
          className={field}
        />
        <select
          aria-label={`${label}: unit`}
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            emit(min, max, e.target.value);
          }}
          className="shrink-0 rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      {loose ? (
        <p className="mt-1 text-xs text-amber-800">
          Currently &ldquo;{value}&rdquo;, which is not a range. Enter the two numbers to replace it, or{" "}
          <button type="button" onClick={() => { setLoose(false); onChange(""); }} className="font-medium underline underline-offset-2 hover:text-red-700">
            clear it
          </button>
          .
        </p>
      ) : inverted ? (
        <p role="alert" className="mt-1 text-xs text-red-700">The first number is above the second.</p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">
          {hint ? `${hint} ` : ""}
          {value ? `Shown as ${value}.` : ""}
        </p>
      )}
    </div>
  );
}

const AMOUNT = /^\s*(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+?)?\s*(?:total\s*fees)?\s*\.?\s*$/i;

/**
 * One amount (a package, a fee) as a number and a unit picker: "₹6.2 LPA". Same idea as the
 * range, for a figure that is a single value. Empty until the number is filled in.
 */
export function AmountField({
  id,
  label,
  value,
  onChange,
  units,
  hint,
  joined = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  units: string[];
  hint?: string;
  /** Write the unit right after the number ("₹18.4L") instead of after a space ("₹6.2 LPA"). */
  joined?: boolean;
}) {
  const m = AMOUNT.exec(value);
  const matchedUnit = m ? units.find((u) => u.toLowerCase() === (m[2] ?? units[0]).toLowerCase()) : undefined;
  const parsed = m && matchedUnit ? { amount: m[1], unit: matchedUnit } : null;
  const [amount, setAmount] = useState(parsed?.amount ?? "");
  const [unit, setUnit] = useState(parsed?.unit ?? units[0]);
  const [loose, setLoose] = useState(value.trim() !== "" && parsed === null);

  const emit = (nextAmount: string, nextUnit: string) => {
    setLoose(false);
    onChange(nextAmount !== "" && Number.isFinite(Number(nextAmount)) ? (joined ? `₹${nextAmount}${nextUnit}` : `₹${nextAmount} ${nextUnit}`) : "");
  };
  const field = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-sm text-ink-soft" aria-hidden="true">₹</span>
        <input id={id} type="number" min={0} step="any" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); emit(e.target.value, unit); }} className={field} />
        <select aria-label={`${label}: unit`} value={unit} onChange={(e) => { setUnit(e.target.value); emit(amount, e.target.value); }} className="shrink-0 rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none">
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      {loose ? (
        <p className="mt-1 text-xs text-amber-800">
          Currently &ldquo;{value}&rdquo;, which is not an amount. Enter a number to replace it, or{" "}
          <button type="button" onClick={() => { setLoose(false); onChange(""); }} className="font-medium underline underline-offset-2 hover:text-red-700">clear it</button>.
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-faint">
          {hint ? `${hint} ` : ""}
          {value ? `Shown as ${value}.` : ""}
        </p>
      )}
    </div>
  );
}
