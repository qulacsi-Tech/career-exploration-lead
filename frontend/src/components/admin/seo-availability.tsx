/** True when any SEO text has been filled in: a title, a description, a canonical address, an intro or FAQs. */
export function hasSeo(seo: unknown): boolean {
  if (!seo || typeof seo !== "object") return false;
  return Object.values(seo as Record<string, unknown>).some((value) => {
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    // A rich-text intro is a document: it counts when it holds a block with text in it.
    if (value && typeof value === "object") return JSON.stringify(value).includes('"text":"');
    return false;
  });
}

/** The "Yes" / "No" shown in the SEO column of the admin lists. */
export function SeoAvailability({ seo }: { seo: unknown }) {
  return hasSeo(seo) ? (
    <span className="font-medium text-emerald-700">Yes</span>
  ) : (
    <span className="text-ink-faint">No</span>
  );
}
