import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { LeadsChart, SourceBars } from "@/components/admin/leads-chart";
import { adminGetDashboard } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LEAD_TYPE_LABEL, formatReceived } from "@/lib/lead-labels";

/*
  Every figure here comes from the admin dashboard endpoint, which counts the
  database. Nothing on this page is sample data.
*/
export default async function AdminDashboard() {
  const dashboard = await withAdminToken((token) => adminGetDashboard(token));
  const { totals, leadsByDay, leadSources, recentLeads } = dashboard;
  const hasEnquiries = leadsByDay.some((day) => day.count > 0);
  const hasSources = leadSources.some((source) => source.count > 0);

  const tiles = [
    { label: "Enquiries", value: totals.leads, href: "/admin/leads" },
    { label: "New enquiries", value: totals.newLeads, href: "/admin/leads?status=new" },
    { label: "Colleges", value: totals.colleges, href: "/admin/colleges" },
    { label: "Exams", value: totals.exams, href: "/admin/exams" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Enquiries and directory size, counted from the database."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-xl border border-line bg-surface px-4 py-4 transition hover:border-brand/40 hover:shadow-sm"
          >
            <p className="text-xs text-ink-soft">{tile.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
              {tile.value.toLocaleString("en-IN")}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminSection
            title="Enquiries per day"
            description="Last 14 days across every form on the site (UTC days)."
            actions={
              <Link
                href="/admin/leads"
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Open inbox
              </Link>
            }
          >
            {hasEnquiries ? (
              <LeadsChart data={leadsByDay} />
            ) : (
              <p className="text-sm text-ink-soft">No enquiries in the last 14 days.</p>
            )}
          </AdminSection>
        </div>

        <AdminSection title="Lead sources" description="Enquiries by type, all time.">
          {hasSources ? (
            <SourceBars data={leadSources} />
          ) : (
            <p className="text-sm text-ink-soft">No enquiries yet.</p>
          )}
        </AdminSection>
      </div>

      <AdminSection
        title="Recent leads"
        description="Newest enquiries first."
        actions={
          <Link
            href="/admin/leads"
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            View all
          </Link>
        }
      >
        {recentLeads.length === 0 ? (
          <p className="text-sm text-ink-soft">No enquiries yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Interest</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Received</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3 pr-3 text-ink-soft">{LEAD_TYPE_LABEL[lead.type] ?? lead.type}</td>
                    <td className="py-3 pr-3 text-ink-soft">{lead.collegeSlug ?? "—"}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatReceived(lead.createdAt)}</td>
                    <td className="py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLE[lead.status]}`}>
                        {LEAD_STATUS_LABEL[lead.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Needs attention" description="Work waiting in the inbox.">
        <Link
          href="/admin/leads?status=new"
          className="flex max-w-xs flex-col rounded-xl border border-line px-4 py-3 transition hover:border-brand/40 hover:shadow-sm"
        >
          <span className="font-display text-2xl font-bold tabular-nums text-brand">
            {totals.newLeads.toLocaleString("en-IN")}
          </span>
          <span className="mt-0.5 text-sm font-medium text-ink">New enquiries to follow up</span>
        </Link>
      </AdminSection>
    </div>
  );
}
