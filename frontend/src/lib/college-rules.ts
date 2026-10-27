/*
  The rules a college record has to pass, mirrored from backend/core/college_rules.py so a mistake is
  shown where it is made, before Save. The server checks again and has the last word. Each check
  returns the message to show, or null when the value is fine.
*/

export const YEAR_MIN = 1800;
export const NEWS_YEAR_MIN = 2000;
export const REVIEW_MIN_CHARS = 20;
export const TAG_MAX_CHARS = 30;

const thisYear = () => new Date().getFullYear();
const todayIso = () => new Date().toISOString().slice(0, 10);

const NAME_PUNCT = new Set(" .,&'’()/-:");
const LETTER_MARK_NUMBER = /^[\p{L}\p{M}\p{N}]$/u;
const DURATION = /^(\d{1,3}(?:\.\d)?)\s*(years?|months?)$/i;
const BATCH = /^\d{4}(?:\s*[-–—]\s*(?:\d{4}|\d{2}))?$/;
const RATIO = /^(?:[1-9]\d{0,2}\s*:\s*[1-9]\d{0,2})?$/;
const NUMBER = /(-?\d+(?:\.\d+)?)\s*(cr|crore|lpa|lakh|l|k)?/gi;
const LAKH: Record<string, number> = { "": 1, l: 1, lpa: 1, lakh: 1, cr: 100, crore: 100, k: 0.01 };

export function nameProblem(value: string, label = "The name"): string | null {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < 2) return `${label} is required.`;
  for (const ch of text) if (!NAME_PUNCT.has(ch) && !LETTER_MARK_NUMBER.test(ch)) return `${label} can use letters, numbers, spaces and . , & ' ( ) / - : only.`;
  return null;
}

export function yearProblem(value: number | null): string | null {
  if (value === null) return null;
  return value >= YEAR_MIN && value <= thisYear() ? null : `The year established must be between ${YEAR_MIN} and ${thisYear()}.`;
}

/** The amounts in a text such as "₹4.2L - 9.6L" or "₹7 - 18 LPA", in lakh, in the order written. */
export function moneyInLakh(text: string): number[] {
  const found = [...text.replace(/,/g, "").matchAll(NUMBER)].map((m) => [Number(m[1]), (m[2] ?? "").toLowerCase()] as const);
  const last = [...found].reverse().find(([, unit]) => unit)?.[1] ?? "";
  return found.map(([n, unit]) => n * (LAKH[unit || last] ?? 1));
}

export function feeRangeProblem(value: string, label = "The fee range"): string | null {
  if (!value.trim()) return null;
  const amounts = moneyInLakh(value);
  if (amounts.some((a) => a < 0)) return `${label} cannot be negative.`;
  if (amounts.length === 1 && /[-–—](\s|$)/.test(value)) return "Enter both the 'From' and the 'To' fee, or clear them.";
  if (amounts.length >= 2 && amounts[0] > amounts[1]) return "The 'From' fee must be less than or equal to the 'To' fee.";
  return null;
}

export function amountProblem(value: string, label: string): string | null {
  return value.trim() && moneyInLakh(value).some((a) => a < 0) ? `${label} must be 0 or more.` : null;
}

export function durationProblem(value: string): string | null {
  return DURATION.test(value.trim().replace(/\s+/g, " ")) ? null : "The duration must be a number of years or months, such as 2 Years or 18 Months.";
}

/** "highest below average" and the like, compared in one unit. */
export function packageProblem(average: string, median: string, highest: string): string | null {
  const top = moneyInLakh(highest)[0];
  if (top === undefined) return null;
  const avg = moneyInLakh(average)[0];
  const med = moneyInLakh(median)[0];
  if (avg !== undefined && top < avg) return "The highest package cannot be below the average package.";
  if (med !== undefined && top < med) return "The highest package cannot be below the median package.";
  return null;
}

export function batchProblem(value: string): string | null {
  return BATCH.test(value.trim()) ? null : "The batch must be a year or a range, such as 2021 or 2021-2025.";
}

/** An ISO date that is not in the future (and, when given, not before `earliestYear`). */
export function dateProblem(value: string, label: string, earliestYear?: number): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label} is not a valid date.`;
  if (value > todayIso()) return `${label} cannot be in the future.`;
  if (earliestYear !== undefined && Number(value.slice(0, 4)) < earliestYear) return `${label} cannot be before ${earliestYear}.`;
  return null;
}

export function ratioProblem(value: string): string | null {
  return RATIO.test(value.trim()) ? null : "Write the ratio as 15:1, both numbers above zero.";
}

/** A score may be any text. One that says percentile or percentage has its first number capped at 100. */
export function scoreProblem(value: string): string | null {
  const numbers = [...value.replace(/,/g, "").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (numbers.length > 0 && /percentile|%ile|\bpct\b|%/i.test(value) && numbers[0] > 100) return "A percentile or percentage must be between 0 and 100.";
  return null;
}

/** An exam as the directory names it ("cat" and "CAT" find "Common Admission Test (CAT)"), or null. */
export function findExam(value: string, directory: string[]): string | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  for (const name of directory) {
    const abbreviation = /\(([^)]+)\)\s*$/.exec(name)?.[1]?.trim().toLowerCase();
    if (name.toLowerCase() === key || abbreviation === key) return name;
  }
  return null;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
