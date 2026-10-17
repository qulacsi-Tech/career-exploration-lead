import type { TrackedEvent } from "@/lib/api";

/** One tracked event as a line an admin can read. */
export function describeEvent(event: TrackedEvent): string {
  const p = event.properties as Record<string, string | number | undefined>;
  switch (event.name) {
    case "page_view":
      return `Viewed ${event.path ?? "a page"}`;
    case "click_cta":
      return `Clicked “${p.label || p.cta || "a button"}”${p.cta && p.label ? ` (${p.cta})` : ""}`;
    case "outbound_click":
      return `Left for ${p.href ?? "another site"}`;
    case "scroll_depth":
      return `Scrolled ${p.depth}% down ${event.path ?? "the page"}`;
    case "time_on_page":
      return `Stayed ${p.seconds}s on ${event.path ?? "the page"}`;
    case "search":
      return `Searched “${p.query ?? ""}” (${p.results ?? 0} results)`;
    case "compare_add":
      return `Added ${p.college} to compare`;
    case "compare_remove":
      return `Removed ${p.college} from compare`;
    case "form_start":
      return "Started the enquiry form";
    case "form_submit":
      return "Sent the enquiry form";
    case "form_error":
      return `Form had errors (${p.fields ?? "fields"})`;
    default:
      return event.name.replace(/_/g, " ");
  }
}
