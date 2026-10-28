import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, FilePlus2, GraduationCap, Inbox, Layers, MessageSquareText, Newspaper, Sparkles } from "lucide-react";
import { AdminSection } from "@/components/admin/admin-section";
import { LeadsChart, SourceBars } from "@/components/admin/leads-chart";
import { CollegeDashboardView } from "@/components/admin/college-dashboard";
import { adminGetDashboard, collegeGetDashboard, getMe } from "@/lib/api";
import { isCollegeAdmin } from "@/lib/roles";
import { withAdminToken } from "@/lib/admin-session";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LEAD_TYPE_LABEL, formatReceived } from "@/lib/lead-labels";

/*
  Every figure here comes from the admin dashboard endpoint, which counts the
  database. Nothing on this page is sample data.
*/

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

export default async function AdminDashboard() {
  // A college admin has a dashboard of their own: their college's enquiries and page views.
  const { mine, name } = await withAdminToken(async (token) => {
    const me = await getMe(token);
    return { mine: isCollegeAdmin(me.role) ? await collegeGetDashboard(token) : null, name: me.name };
  });
  if (mine) return <CollegeDashboardView data={mine} />;

  const dashboard = await withAdminToken((token) => adminGetDashboard(token));
  const { totals, leadsByDay, leadSources, recentLeads } = dashboard;
  const hasEnquiries = leadsByDay.some((day) => day.count > 0);
  const hasSources = leadSources.some((source) => source.count > 0);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Each figure has its own colour, so the row reads at a glance: the tint, the icon chip and the glow match.
  const tiles = [
    { label: "Enquiries", value: totals.leads, href: "/admin/leads", Icon: MessageSquareText, tint: "from-amber-50 to-white", chip: "bg-amber-100 text-amber-700", glow: "bg-amber-300/30" },
    { label: "New enquiries", value: totals.newLeads, href: "/admin/leads?status=new", Icon: Inbox, tint: "from-rose-50 to-white", chip: "bg-rose-100 text-rose-700", glow: "bg-rose-300/30" },
    { label: "Colleges", value: totals.colleges, href: "/admin/colleges", Icon: GraduationCap, tint: "from-emerald-50 to-white", chip: "bg-emerald-100 text-emerald-700", glow: "bg-emerald-300/30" },
    { label: "Exams", value: totals.exams, href: "/admin/exams", Icon: BookOpenCheck, tint: "from-sky-50 to-white", chip: "bg-sky-100 text-sky-700", glow: "bg-sky-300/30" },
  ];

  const shortcuts = [
    { label: "Add a college", hint: "New listing", href: "/admin/colleges", Icon: FilePlus2 },
    { label: "Write an article", hint: "News & guides", href: "/admin/articles", Icon: Newspaper },
    { label: "Edit the homepage", hint: "Hero, bands, copy", href: "/admin/sections/homepage", Icon: Sparkles },
    { label: "Catalogue", hint: "Courses & categories", href: "/admin/catalogue", Icon: Layers },
  ];

  const card = "rounded-2xl border border-white/80 bg-white/85 shadow-[0_10px_40px_-20px_rgba(123,26,42,0.3)] backdrop-blur";

  return (
    <div className="space-y-6">
      {/* Welcome banner: the one thing to act on, and the way into the inbox. */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-ink via-brand-dark to-brand p-6 text-white shadow-[0_20px_50px_-20px_rgba(123,26,42,0.6)] sm:p-8">
        <span aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-gold/25 blur-2xl" />
        <span
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to right, transparent 30%, black)",
            WebkitMaskImage: "linear-gradient(to right, transparent 30%, black)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-white/70">{today}</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
              {greeting()}, {name.split(" ")[0] || "there"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              {totals.newLeads > 0
                ? `${totals.newLeads.toLocaleString("en-IN")} new ${totals.newLeads === 1 ? "enquiry is" : "enquiries are"} waiting for a follow-up.`
                : "Nothing is waiting in the inbox. Here is how the directory is doing."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/leads?status=new" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Open inbox
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/" className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
              View site
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ label, value, href, Icon, tint, chip, glow }) => (
          <Link
            key={label}
            href={href}
            className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${tint} p-5 shadow-[0_10px_40px_-22px_rgba(123,26,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_44px_-18px_rgba(123,26,42,0.4)]`}
          >
            <span aria-hidden className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-xl ${glow}`} />
            <div className="relative flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${chip}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-faint opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
            </div>
            <p className="relative mt-4 font-display text-4xl font-extrabold tabular-nums text-ink">{value.toLocaleString("en-IN")}</p>
            <p className="relative mt-0.5 text-sm font-medium text-ink-soft">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminSection
            title="Enquiries per day"
            description="Last 14 days across every form on the site (UTC days)."
            actions={
              <Link href="/admin/leads" className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand">
                Open inbox
              </Link>
            }
          >
            {hasEnquiries ? <LeadsChart data={leadsByDay} /> : <p className="text-sm text-ink-soft">No enquiries in the last 14 days.</p>}
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Lead sources" description="Enquiries by type, all time.">
            {hasSources ? <SourceBars data={leadSources} /> : <p className="text-sm text-ink-soft">No enquiries yet.</p>}
          </AdminSection>
        </div>
      </div>

      {/* Quick ways in: the screens editors open most. */}
      <section aria-label="Shortcuts">
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Quick actions</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {shortcuts.map(({ label, hint, href, Icon }) => (
            <Link key={label} href={href} className={`group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg ${card}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                <span className="block truncate text-xs text-ink-faint">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <AdminSection
        title="Recent leads"
        description="Newest enquiries first."
        actions={
          <Link href="/admin/leads" className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand">
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
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Interest</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">College</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Received</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-line-soft transition last:border-b-0 hover:bg-brand-soft/30">
                    <td className="py-3 pr-3 font-medium text-ink">{LEAD_TYPE_LABEL[lead.type] ?? lead.type}</td>
                    <td className="py-3 pr-3 text-ink-soft">{lead.collegeSlug ?? "—"}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatReceived(lead.createdAt)}</td>
                    <td className="py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLE[lead.status]}`}>
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
    </div>
  );
}
