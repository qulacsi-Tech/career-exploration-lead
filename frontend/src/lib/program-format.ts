/**
 * Display forms for the free-text duration and fee fields on a programme.
 * Editors type these by hand, so they arrive as "1 years", "500000" or "".
 */

/** "1 years" becomes "1 year"; "2 year" becomes "2 years". Anything else is left as typed. */
export function formatDuration(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  const match = /^(\d+(?:\.\d+)?)\s*(year|years|month|months)$/i.exec(text);
  if (!match) return text;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase().replace(/s$/, "");
  return `${match[1]} ${unit}${amount === 1 ? "" : "s"}`;
}

/** A bare number is read as rupees and grouped the Indian way: "500000" becomes "₹5,00,000". */
export function formatFees(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (/^\d+$/.test(text)) return `₹${Number(text).toLocaleString("en-IN")}`;
  return text;
}
