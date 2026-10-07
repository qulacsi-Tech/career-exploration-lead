"use client";

import { useState } from "react";

/*
  A date chosen from the browser's date picker.

  The site shows dates as short text ("26 Mar 2027"), and the exam fields are stored
  that way, so the picker's value is turned into that text on every change and read
  back from it. A value that is not an exact date (an older entry such as "May 2027")
  cannot be placed on the calendar: it is shown as it is, with a note, until a date is
  picked or it is cleared.
*/

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "26 Mar 2027" -> "2027-03-26" for the picker, or "" when the text is not an exact date. */
function toIso(text: string): string {
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(text.trim());
  if (!m) return "";
  const month = MONTHS.findIndex((name) => name.toLowerCase() === m[2].toLowerCase());
  const day = Number(m[1]);
  if (month < 0 || day < 1 || day > 31) return "";
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2027-03-26" -> "26 Mar 2027". Plain string work, so no time zone can shift the day. */
function fromIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  /** The date as text, e.g. "26 Mar 2027". Empty: no date. */
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const iso = toIso(value);
  const loose = value.trim() !== "" && iso === "";

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={iso}
        onChange={(e) => onChange(fromIso(e.target.value))}
        className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      />
      {loose ? (
        <p className="mt-1 text-xs text-amber-800">
          Currently &ldquo;{value}&rdquo;, which is not an exact date. Pick a date to replace it, or{" "}
          <button type="button" onClick={() => onChange("")} className="font-medium underline underline-offset-2 hover:text-red-700">
            clear it
          </button>
          .
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

/**
 * The same picker for the plain `<form action>` screens: it keeps its own value and sends
 * it as the text field `name`, so the form's action receives "26 Mar 2027" as before.
 */
export function FormDateField({
  id,
  name,
  label,
  defaultValue = "",
  hint,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <DateField id={id} label={label} value={value} onChange={setValue} hint={hint} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
