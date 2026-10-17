import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { LeadsChart } from "@/components/admin/leads-chart";
import type { CollegeDashboard } from "@/lib/api";

/** A college admin's landing page: how their college is doing, in numbers the API counted. */
export function CollegeDashboardView({ data }: { data: CollegeDashboard }) {
  const { totals, byDay, days, college } = data;
  const tiles: { label: string; value: number; href?: string }[] = [
    { label: "Enquiries", value: totals.leads, href: "/admin/leads" },
    { label: "New enquiries", value: totals.newLeads, href: "/admin/leads?status=new" },
    { label: `Page views, ${days} days`, value: totals.pageViews },
    { label: `Visitors, ${days} days`, value: totals.visitors },
    { label: `Button clicks, ${days} days`, value: totals.ctaClicks },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={college.name}
        description="How your college page is doing. Page figures count visitors who accepted analytics, so they are a floor."
        actions={
          <Link
            href={`/college/${college.slug}`}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            View your page
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="text-xs text-ink-soft">{tile.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{tile.value.toLocaleString("en-IN")}</p>
            </>
          );
          return tile.href ? (
            <Link
              key={tile.label}
              href={tile.href}
              className="rounded-xl border border-line bg-surface px-4 py-4 transition hover:border-brand/40 hover:shadow-sm"
            >
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="rounded-xl border border-line bg-surface px-4 py-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="Enquiries per day" description={`Last ${days} days (UTC days).`}>
          {byDay.some((d) => d.leads > 0) ? (
            <LeadsChart data={byDay.map((d) => ({ date: d.date, count: d.leads }))} noun="enquiries" />
          ) : (
            <p className="text-sm text-ink-soft">No enquiries in this period.</p>
          )}
        </AdminSection>

        <AdminSection title="Page views per day" description={`Views of your college page, last ${days} days.`}>
          {byDay.some((d) => d.views > 0) ? (
            <LeadsChart data={byDay.map((d) => ({ date: d.date, count: d.views }))} noun="page views" />
          ) : (
            <p className="text-sm text-ink-soft">No views recorded in this period yet.</p>
          )}
        </AdminSection>
      </div>
    </div>
  );
}
