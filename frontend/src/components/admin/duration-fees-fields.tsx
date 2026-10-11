"use client";

import { useState } from "react";

/*
  A programme's duration and fees, as a number beside a choice, instead of free text.

    Duration   a number and months or years        8 months, 2 years
    Fees       a number and a currency (rupees by default)   ₹4,00,000

  Both still save as one piece of text, the way the site already shows them, so nothing
  else changes. A value saved before these fields existed is read if it follows the same
  shape ("8 months", "INR 4,00,000"). One that does not ("w efw", "₹18.4L Total Fees") is
  kept exactly as it is until a number is typed, and the line under the field says so.
*/

// A number box that takes the spare width, and a choice beside it that keeps its own width. Neither is
// `w-full`: that is what squeezed the number box to nothing when it shared a row with the choice.
const box = "rounded-lg border border-line bg-bg px-3.5 py-3 text-base text-ink focus:border-brand focus:outline-none";
const numberBox = `${box} mt-1.5 min-w-0 flex-1`;
const choiceBox = `${box} mt-1.5 shrink-0`;

const UNITS = ["days", "months", "years"] as const;
type Unit = (typeof UNITS)[number];

export const CURRENCIES = [
  { code: "INR", symbol: "₹", locale: "en-IN", label: "₹ Rupees (INR)" },
  { code: "USD", symbol: "$", locale: "en-US", label: "$ US dollars (USD)" },
  { code: "EUR", symbol: "€", locale: "en-IE", label: "€ Euros (EUR)" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "£ Pounds (GBP)" },
  { code: "AUD", symbol: "", locale: "en-AU", label: "Australian dollars (AUD)" },
  { code: "CAD", symbol: "", locale: "en-CA", label: "Canadian dollars (CAD)" },
  { code: "SGD", symbol: "", locale: "en-SG", label: "Singapore dollars (SGD)" },
  { code: "AED", symbol: "", locale: "en-AE", label: "UAE dirhams (AED)" },
] as const;
type Currency = (typeof CURRENCIES)[number];

const rupees = CURRENCIES[0];

/** "8 months" -> { amount: "8", unit: "months" }; anything else -> null. */
function parseDuration(text: string): { amount: string; unit: Unit } | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(day|month|year)s?\s*$/i.exec(text);
  return m ? { amount: m[1], unit: `${m[2].toLowerCase()}s` as Unit } : null;
}

function writeDuration(amount: string, unit: Unit) {
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n <= 0) return "";
  // "1 year", not "1 years".
  return `${amount} ${n === 1 ? unit.slice(0, -1) : unit}`;
}

/** "₹4,00,000", "INR 4,00,000" or "USD 17,000" -> amount and currency; anything else -> null. */
function parseFees(text: string): { amount: string; currency: Currency } | null {
  const m = /^\s*(INR|USD|EUR|GBP|AUD|CAD|SGD|AED|[₹$€£])?\s*([\d,]+(?:\.\d+)?)\s*$/i.exec(text);
  if (!m) return null;
  const mark = (m[1] ?? "").toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === mark || (c.symbol !== "" && c.symbol === m[1])) ?? rupees;
  return { amount: m[2].replace(/,/g, ""), currency };
}

function writeFees(amount: string, currency: Currency) {
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n < 0) return "";
  const grouped = new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 2 }).format(n);
  return currency.symbol ? `${currency.symbol}${grouped}` : `${currency.code} ${grouped}`;
}

export function DurationField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const parsed = parseDuration(value);
  const odd = value.trim() !== "" && parsed === null;
  // The choice is kept here too, so picking years before typing a number is not forgotten.
  const [picked, setPicked] = useState<Unit>("months");
  const amount = parsed?.amount ?? "";
  const unit = parsed?.unit ?? picked;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          min={1}
          max={999}
          step="any"
          inputMode="decimal"
          value={amount}
          placeholder="e.g. 8"
          onChange={(e) => onChange(writeDuration(e.target.value, unit))}
          className={numberBox}
        />
        <select aria-label={`${label}: days, months or years`} value={unit} onChange={(e) => {
            setPicked(e.target.value as Unit);
            if (amount) onChange(writeDuration(amount, e.target.value as Unit));
          }} className={`${choiceBox} w-36`}>
          {UNITS.map((u) => (
            <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        {odd ? `Saved as “${value}”. Enter a number to replace it.` : (hint ?? "")}
      </p>
    </div>
  );
}

export function FeesField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const parsed = parseFees(value);
  const odd = value.trim() !== "" && parsed === null;
  const [picked, setPicked] = useState<Currency>(rupees);
  const amount = parsed?.amount ?? "";
  const currency = parsed?.currency ?? picked;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={amount}
          placeholder="e.g. 400000"
          onChange={(e) => onChange(writeFees(e.target.value, currency))}
          className={numberBox}
        />
        <select aria-label={`${label}: currency`} value={currency.code} onChange={(e) => {
            const next = CURRENCIES.find((c) => c.code === e.target.value) ?? rupees;
            setPicked(next);
            if (amount) onChange(writeFees(amount, next));
          }} className={`${choiceBox} w-32`}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.symbol ? `${c.symbol} ${c.code}` : c.code}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        {odd ? `Saved as “${value}”. Enter a number to replace it.` : (hint ?? "")}
      </p>
    </div>
  );
}
