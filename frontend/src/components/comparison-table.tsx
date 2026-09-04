import Link from "next/link";
import type { College } from "@/lib/mock-data";
import { compareRows } from "@/lib/comparison-data";
import { Chip } from "@/components/ui/chip";

/**
 * The side-by-side comparison table.
 *
 * A real <table> with a header row of colleges and one row per attribute —
 * which is what this is, and what lets a screen reader announce "Average
 * package, Eastwind, ₹19.6 LPA" instead of reading three disconnected columns.
 *
 * The winning cell in a row is marked where winning means something (rank,
 * rating, packages) and left unmarked where it does not (fees, location). A tie
 * marks nothing — see `comparison-data`.
 *
 * The marker is a chip, not just colour: "best" conveyed by a green background
 * alone is invisible to anyone who cannot distinguish it.
 */
export function ComparisonTable({ colleges }: { colleges: College[] }) {
  if (colleges.length < 2) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          {colleges.map((c) => c.name).join(" versus ")} compared on fees,
          placements, ranking, cutoffs and approvals
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 border-b border-line py-3 pr-4 text-left align-bottom">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Attribute
              </span>
            </th>
            {colleges.map((college) => (
              <th
                key={college.slug}
                scope="col"
                className="border-b border-line px-4 py-3 text-left align-bottom"
              >
                <Link
                  href={`/college/${college.slug}`}
                  className="font-display text-base font-bold text-ink hover:text-brand"
                >
                  {college.name}
                </Link>
                <span className="mt-1 block text-xs font-normal text-ink-faint">
                  {college.city}, {college.state}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {compareRows.map((row) => {
            const winner = row.better ? row.better(colleges) : null;
            return (
              <tr key={row.key} className="border-b border-line-soft last:border-b-0">
                <th
                  scope="row"
                  className="py-3 pr-4 text-left align-top text-xs font-semibold text-ink-soft"
                >
                  {row.label}
                </th>
                {colleges.map((college, index) => (
                  <td
                    key={college.slug}
                    className={`px-4 py-3 align-top text-sm ${
                      winner === index ? "bg-brand-soft/50 text-ink" : "text-ink-soft"
                    }`}
                  >
                    {row.value(college)}
                    {winner === index && (
                      <span className="mt-1 block">
                        <Chip tone="brand">Best</Chip>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
