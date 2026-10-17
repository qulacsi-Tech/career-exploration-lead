import type { LeadStatus } from "@/lib/api";

/** How a lead status reads on screen. The API stores the lowercase key. */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  closed: "Closed",
};

/** Colour for each status. The label is always shown too, so colour is never the only cue. */
export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  new: "border-brand/40 bg-brand-soft text-brand-ink",
  contacted: "border-line bg-bg-alt text-ink-soft",
  converted: "border-gold/40 bg-gold-soft text-gold",
  closed: "border-line bg-bg text-ink-faint",
};

/** The enquiry type as an admin reads it. */
export const LEAD_TYPE_LABEL: Record<string, string> = {
  callback: "Callback",
  counselling: "Counselling",
  brochure: "Brochure",
  enquiry: "Enquiry",
};

export function formatReceived(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** A full date and time, for the student's own pages. */
export function formatFull(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "bengaluru-institute-of-management" as "Bengaluru Institute Of Management", for a college known only by its slug. */
export function prettySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
