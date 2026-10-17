import type { TrackedEvent } from "@/lib/api";
import { describeEvent } from "@/lib/events-format";
import { formatFull } from "@/lib/lead-labels";

/**
 * What a visitor did, newest first. Quiet events (how far they scrolled, how
 * long they stayed) are dimmed so the pages and clicks read first.
 */
export function EventTimeline({ events }: { events: TrackedEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-soft">No activity recorded.</p>;

  return (
    <ol className="max-h-80 space-y-2 overflow-y-auto pr-2 text-sm">
      {events.map((event) => {
        const quiet = event.name === "scroll_depth" || event.name === "time_on_page";
        return (
          <li key={event.id} className="flex gap-3">
            <span className="w-40 shrink-0 text-xs text-ink-faint">{formatFull(event.at)}</span>
            <span className={quiet ? "text-ink-faint" : "text-ink"}>{describeEvent(event)}</span>
          </li>
        );
      })}
    </ol>
  );
}
