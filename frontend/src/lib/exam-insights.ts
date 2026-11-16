/**
 * Small readings of an exam record for its cards and pages: its short name, how far away its deadline is, and a
 * friendly line about it. Shared by the listing and the detail page so the two always agree.
 */

import type { Exam } from "@/lib/api";

const DAY = 24 * 60 * 60 * 1000;

/** "Common Admission Test (CAT)" → "CAT"; a name without brackets is kept as it is. */
export function examShortName(exam: Pick<Exam, "name" | "shortName">): string {
  if (exam.shortName?.trim()) return exam.shortName.trim();
  return exam.name.match(/\(([^)]+)\)/)?.[1]?.trim() || exam.name.replace(/\s*\(.*\)\s*/, "").trim() || exam.name;
}

/** The editor's date text ("26 Mar 2027", "May 2027") as a time, or null when it cannot be read. */
export function parseExamDate(text: string | undefined | null): number | null {
  if (!text?.trim()) return null;
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : t;
}

/** Whole days from `now` until the date (0 on the day itself, negative once it has passed), or null when unknown. */
export function daysUntil(text: string | undefined | null, now: number): number | null {
  const t = parseExamDate(text);
  if (t === null) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((t - start.getTime()) / DAY);
}

/** What a deadline countdown reads as, in words and as the number to make big. */
export function countdown(days: number | null): { value: string; unit: string; tone: "urgent" | "soon" | "calm" | "closed" | "unknown" } {
  if (days === null) return { value: "Upcoming", unit: "Dates soon", tone: "unknown" };
  if (days < 0) return { value: "Closed", unit: "Registration over", tone: "closed" };
  if (days === 0) return { value: "Today", unit: "Last day to apply", tone: "urgent" };
  if (days <= 7) return { value: String(days), unit: days === 1 ? "day left" : "days left", tone: "urgent" };
  if (days <= 30) return { value: String(days), unit: "days left", tone: "soon" };
  return { value: String(days), unit: "days left", tone: "calm" };
}

/** One friendly line about the exam, chosen from what we know about it. */
export function examVibe(exam: Exam, days: number | null, students = 0): string {
  if (days !== null && days >= 0 && days <= 7) return "The clock is ticking. Apply now!";
  if (days !== null && days >= 0 && days <= 30) return "Registration closes soon, don't snooze.";
  if (students >= 50) return "A crowd favourite on our mock tests.";
  if (students > 0) return "Students are already practising for this one.";
  if (exam.level === "National") return "One paper, doors across the country.";
  if (days !== null && days < 0) return "Missed this round? Start prepping for the next.";
  return "Prepare, practise, and perform your best.";
}

/** "1.2k" for big counts, the plain number below a thousand. */
export function compactCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

/** "2 days 3 hours", "45 minutes", "under a minute": a wait in words. Mirrors the server's wording. */
export function humanWait(seconds: number): string {
  if (seconds < 60) return "under a minute";
  const minutes = Math.ceil(seconds / 60);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (mins && !days) parts.push(`${mins} ${mins === 1 ? "minute" : "minutes"}`);
  return parts.slice(0, 2).join(" ");
}

/** The gap between attempts as the admin set it: "30 minutes", "6 hours", "2 days". */
export function gapLabel(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} ${minutes === 1440 ? "day" : "days"}`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
