import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { LeadsChart, SourceBars } from "@/components/admin/leads-chart";
import {
  dashboardStats,
  leadsByDay,
  leadSources,
  recentLeads,
  attentionQueues,
} from "@/lib/admin-sample-data";

const statusStyles: Record<string, string> = {
  New: "border-brand/40 bg-brand-soft text-brand-ink",
  Contacted: "border-line bg-bg-alt text-ink-soft",
  Qualified: "border-gold/40 bg-gold-soft text-gold",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Content, leads and SEO health at a glance."
        actions={
          /* Labelled explicitly: these figures are illustrative, and a demo is
             exactly where an unlabelled number gets quoted back as real. */
          <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-faint">
            Sample data
          </span>
        }
      />

      {/* Stat tiles, not charts: a single number has no shape worth plotting. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-line bg-surface px-4 py-4 transition hover:border-brand/40 hover:shadow-sm"
          >
            <p className="text-xs text-ink-soft">{stat.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{stat.value}</p>
            {stat.delta && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
                <TrendIcon
                  direction={stat.delta.direction}
                  className="h-3 w-3 text-brand"
                />
                {stat.delta.value} this week
              </p>
            )}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminSection
            title="Enquiries per day"
            description="Last 14 days across every form on the site."
            actions={
              <Link
                href="/admin/leads"
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Open inbox
              </Link>
            }
          >
            <LeadsChart data={leadsByDay} />
          </AdminSection>
        </div>

        <AdminSection title="Lead sources" description="Where this month's enquiries came from.">
          <SourceBars data={leadSources} />
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
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Interest</th>
                <th scope="col" className="py-2 pr-3 font-semibold">City</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Received</th>
                <th scope="col" className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.name} className="border-b border-line-soft last:border-b-0">
                  <td className="py-3 pr-3 font-medium text-ink">{lead.name}</td>
                  <td className="py-3 pr-3 text-ink-soft">{lead.interest}</td>
                  <td className="py-3 pr-3 text-ink-soft">{lead.city}</td>
                  <td className="py-3 pr-3 text-ink-faint">{lead.received}</td>
                  <td className="py-3">
                    {/* Status reads from the label as well as the colour. */}
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusStyles[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="Needs attention" description="Queues that block publishing or follow-up.">
        <ul className="grid gap-3 sm:grid-cols-3">
          {attentionQueues.map((queue) => (
            <li key={queue.label}>
              <Link
                href={queue.href}
                className="flex h-full flex-col rounded-xl border border-line px-4 py-3 transition hover:border-brand/40 hover:shadow-sm"
              >
                <span className="font-display text-2xl font-bold tabular-nums text-brand">
                  {queue.count}
                </span>
                <span className="mt-0.5 text-sm font-medium text-ink">{queue.label}</span>
                <span className="mt-1 text-xs text-ink-soft">{queue.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </AdminSection>
    </div>
  );
}

function TrendIcon({ direction, className }: { direction: "up" | "down"; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path
        d={direction === "up" ? "M10 15V5m0 0L5.5 9.5M10 5l4.5 4.5" : "M10 5v10m0 0l4.5-4.5M10 15l-4.5-4.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
