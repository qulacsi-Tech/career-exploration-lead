"use client";

import { useState } from "react";

const UNITS = [
  { key: "minutes", label: "minutes", factor: 1 },
  { key: "hours", label: "hours", factor: 60 },
  { key: "days", label: "days", factor: 1440 },
] as const;
type Unit = (typeof UNITS)[number]["key"];

/** The largest unit the stored minutes divide into evenly, so 2880 shows as "2 days". */
function unitOf(minutes: number | null): Unit {
  if (!minutes) return "hours";
  if (minutes % 1440 === 0) return "days";
  if (minutes % 60 === 0) return "hours";
  return "minutes";
}

/**
 * How long a student waits after an attempt before the next one: a number and a unit (minutes, hours, days), kept as
 * minutes. Empty means no wait. The largest allowed is a year.
 */
export function RetakeGapField({ value, onChange }: { value: number | null; onChange: (minutes: number | null) => void }) {
  const [unit, setUnit] = useState<Unit>(() => unitOf(value));
  // What is typed, kept as typed (so "1." on the way to "1.5" is not rewritten under the cursor).
  const [shown, setShown] = useState(() => {
    const factor = UNITS.find((u) => u.key === unitOf(value))!.factor;
    return value ? String(Math.round((value / factor) * 100) / 100) : "";
  });

  const write = (text: string, nextUnit: Unit = unit) => {
    const n = Number(text);
    if (text === "" || !Number.isFinite(n) || n <= 0) return onChange(null);
    const f = UNITS.find((u) => u.key === nextUnit)!.factor;
    onChange(Math.min(525600, Math.max(1, Math.round(n * f))));
  };

  return (
    <div>
      <label htmlFor="pt-gap" className="block text-xs font-semibold text-ink">Gap before a re-attempt</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="pt-gap"
          type="number"
          min={1}
          step="any"
          inputMode="decimal"
          value={shown}
          placeholder="No wait"
          aria-describedby="pt-gap-hint"
          onChange={(e) => {
            setShown(e.target.value);
            write(e.target.value);
          }}
          className="w-full min-w-0 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <select
          aria-label="Unit"
          value={unit}
          onChange={(e) => {
            const next = e.target.value as Unit;
            setUnit(next);
            if (shown) write(shown, next);
          }}
          className="shrink-0 rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {UNITS.map((u) => (
            <option key={u.key} value={u.key}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <p id="pt-gap-hint" className="mt-1 text-xs text-ink-faint">How long a student waits after an attempt before the next one. Empty: they can retake at once.</p>
    </div>
  );
}
