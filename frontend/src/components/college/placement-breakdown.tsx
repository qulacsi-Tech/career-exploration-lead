import type { PlacementBreakdown } from "@/lib/api";
import { isRealPackage } from "@/lib/college-insights";

/**
 * A year's placements by category, course and specialisation: one table with a header row for each
 * category. A figure the college did not give shows as a dash. Renders nothing for an empty list.
 */
export function PlacementBreakdownTable({ rows }: { rows: PlacementBreakdown[] | undefined }) {
  if (!rows || rows.length === 0) return null;

  const groups = new Map<string, PlacementBreakdown[]>();
  for (const row of rows) groups.set(row.category, [...(groups.get(row.category) ?? []), row]);
  const percent = (r: PlacementBreakdown) => (r.placed != null && r.students ? `${Math.round((r.placed / r.students) * 100)}%` : "—");
  const package_ = (v: string) => (isRealPackage(v) ? v : "—");

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-faint">
            <th scope="col" className="py-3 pr-4 font-semibold">Course</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Average</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Highest</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Placed</th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">Batch</th>
            <th scope="col" className="py-3 text-right font-semibold">%</th>
          </tr>
        </thead>
        {[...groups].map(([category, list]) => (
          <tbody key={category || "—"}>
            {category && (
              <tr>
                <th colSpan={6} scope="colgroup" className="bg-brand-soft/50 px-3 py-2 text-xs font-bold text-brand-ink">{category}</th>
              </tr>
            )}
            {list.map((r) => (
              <tr key={`${r.course}|${r.specialisation}`} className="border-b border-line-soft">
                <th scope="row" className="py-3.5 pr-4 font-semibold text-ink">
                  {r.course}
                  {r.specialisation && <span className="block text-xs font-normal text-ink-soft">{r.specialisation}</span>}
                </th>
                <td className="py-3.5 pr-4 text-ink-soft">{package_(r.average)}</td>
                <td className="py-3.5 pr-4 text-ink-soft">{package_(r.highest)}</td>
                <td className="py-3.5 pr-4 text-right text-ink-soft">{r.placed ?? "—"}</td>
                <td className="py-3.5 pr-4 text-right text-ink-soft">{r.students ?? "—"}</td>
                <td className="py-3.5 text-right text-ink-soft">{percent(r)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
