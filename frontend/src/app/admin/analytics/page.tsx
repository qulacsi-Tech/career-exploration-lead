import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { LeadsChart, SourceBars } from "@/components/admin/leads-chart";
import { adminGetAnalytics } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { prettySlug } from "@/lib/lead-labels";

const RANGES = [7, 14, 30, 90] as const;

/*
  Server component. Every figure is counted by the API from the events the site
  recorded; nothing is estimated. Only visitors who accepted analytics appear,
  so these are a floor, not a head count of everyone who came.
*/
export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const { days: raw } = await searchParams;
  const requested = Number(Array.isArray(raw) ? raw[0] : raw);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 14;

  const data = await withAdminToken((token) => adminGetAnalytics(token, days));
  const { totals, byDay, topPages, topCtas, topColleges, sources, devices, funnel } = data;

  const tiles = [
    { label: "Visitors", value: totals.visitors },
    { label: "Visits", value: totals.sessions },
    { label: "Page views", value: totals.pageViews },
    { label: "Enquiries", value: totals.leads },
    { label: "New accounts", value: totals.signups },
  ];
  const hasTraffic = byDay.some((d) => d.visitors > 0);
  const top = funnel[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visitor analytics"
        description="Who came to the site and what they did, for visitors who accepted analytics. Counted by browser: one person on two devices counts twice until they sign in."
      />

      <nav aria-label="Time range" className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?days=${range}`}
            aria-current={range === days ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              range === days ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            Last {range} days
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-line bg-surface px-4 py-4">
            <p className="text-xs text-ink-soft">{tile.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{tile.value.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      <AdminSection title="Visitors per day" description={`Distinct browsers per day, last ${days} days (UTC days).`}>
        {hasTraffic ? (
          <LeadsChart data={byDay.map((d) => ({ date: d.date, count: d.visitors }))} noun="visitors" />
        ) : (
          <p className="text-sm text-ink-soft">
            No visits recorded in this period yet. Events appear once a visitor accepts the analytics banner.
          </p>
        )}
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="From visit to enquiry" description="Visitors who reached each step.">
          {top === 0 ? (
            <p className="text-sm text-ink-soft">Nothing to show yet.</p>
          ) : (
            <ol className="space-y-3">
              {funnel.map((step, index) => (
                <li key={step.step}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink">
                      {index + 1}. {step.step}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      {step.count.toLocaleString("en-IN")}
                      <span className="ml-1.5 text-xs text-ink-faint">{Math.round((step.count / top) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-alt">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(step.count / top) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>

        <AdminSection title="Where visitors came from" description="Distinct visitors by source: the campaign tag, the referring site, or direct.">
          {sources.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing to show yet.</p>
          ) : (
            <SourceBars data={sources.map((s) => ({ label: s.source, count: s.visitors }))} />
          )}
        </AdminSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="Most viewed pages">
          <Table
            empty="No page views yet."
            head={["Page", "Views", "Visitors"]}
            rows={topPages.map((p) => [p.path, p.views, p.visitors])}
          />
        </AdminSection>

        <AdminSection title="Most clicked buttons" description="Buttons and links tagged for tracking.">
          <Table
            empty="No clicks recorded yet."
            head={["Button", "Clicks", "Visitors"]}
            rows={topCtas.map((c) => [c.label ? `${c.label} (${c.cta})` : c.cta, c.clicks, c.visitors])}
          />
        </AdminSection>

        <AdminSection title="Most viewed colleges">
          <Table
            empty="No college views yet."
            head={["College", "Views", "Visitors"]}
            rows={topColleges.map((c) => [prettySlug(c.slug), c.views, c.visitors])}
          />
        </AdminSection>

        <AdminSection title="Devices">
          {devices.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing to show yet.</p>
          ) : (
            <SourceBars data={devices.map((d) => ({ label: d.device, count: d.visitors }))} />
          )}
        </AdminSection>
      </div>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-ink-faint">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-2 font-semibold ${i === 0 ? "pr-3" : "w-20 text-right"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-line-soft last:border-b-0">
            {row.map((cell, i) => (
              <td
                key={i}
                className={`py-2.5 ${i === 0 ? "min-w-0 break-all pr-3 text-ink" : "text-right tabular-nums text-ink-soft"}`}
              >
                {typeof cell === "number" ? cell.toLocaleString("en-IN") : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
