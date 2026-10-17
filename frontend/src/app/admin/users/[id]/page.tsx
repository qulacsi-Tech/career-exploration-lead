import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { EventTimeline } from "@/components/admin/event-timeline";
import { ResetUserPassword } from "@/components/admin/reset-user-password";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { ApiError, adminGetUser, getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { roleLabel } from "@/lib/roles";
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LEAD_TYPE_LABEL, formatFull, prettySlug } from "@/lib/lead-labels";

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const [user, me] = await withAdminToken((token) => Promise.all([adminGetUser(token, id), getMe(token)])).catch((err) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });
  const administrative = user.role !== "USER";

  const facts: [string, string | null][] = [
    ["Email", user.email],
    ["Phone", user.phone],
    ["Location", [user.city, user.state].filter(Boolean).join(", ") || null],
    ["Interested in", user.preferredStream ? prettySlug(user.preferredStream) : null],
    ["Preparing for", user.targetExam ? prettySlug(user.targetExam) : null],
    ["Signed up with", user.authProvider === "google" ? "Google" : "Email and password"],
    ["Joined", formatFull(user.createdAt)],
    ["Last sign-in", formatFull(user.lastLoginAt)],
    ["Visits recorded", String(user.sessions)],
    ["Agreed to marketing messages", user.marketingConsent ? "Yes" : "No"],
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={user.name}
        description={administrative ? `${roleLabel(user.role)} account.` : "Student account."}
        actions={
          <>
            <Link href={administrative ? "/admin/users?tab=administrative" : "/admin/users"} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
              {administrative ? "Administrative accounts" : "General accounts"}
            </Link>
            {user.canManage && user.id !== me.id && (
              <>
                <ResetUserPassword id={user.id} name={user.name} />
                <UserActiveToggle id={user.id} isActive={user.isActive} name={user.name} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="Details">
          <dl className="space-y-2 text-sm">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-44 shrink-0 text-ink-faint">{label}</dt>
                  <dd className="min-w-0 break-words text-ink">{value}</dd>
                </div>
              ))}
          </dl>
        </AdminSection>

        <AdminSection title="Enquiries" description="Newest first. Open the inbox to reply.">
          {user.leads.length === 0 ? (
            <p className="text-sm text-ink-soft">No enquiries sent.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {user.leads.map((lead) => (
                <li key={lead.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink">{lead.programName ?? (lead.collegeSlug ? prettySlug(lead.collegeSlug) : "General enquiry")}</p>
                    <p className="text-xs text-ink-faint">
                      {LEAD_TYPE_LABEL[lead.type] ?? lead.type} · {formatFull(lead.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLE[lead.status]}`}>
                    {LEAD_STATUS_LABEL[lead.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection title="Activity on the site" description="Pages viewed and buttons clicked since they agreed to analytics, newest first. Last 100.">
        <EventTimeline events={user.events} />
      </AdminSection>
    </div>
  );
}
