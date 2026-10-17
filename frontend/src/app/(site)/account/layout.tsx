import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AccountTabs } from "@/components/account/account-tabs";
import { getMyLeads } from "@/lib/api";
import { getCurrentUser, getUserToken } from "@/lib/user-session";

/**
 * The signed-in student's area: a header with who they are, and tabs for their
 * details, enquiries, replies and activity.
 *
 * Reads the session cookie, so everything under /account renders per request.
 * Without a session the visitor is sent to log in and brought back.
 */
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  // Counts for the tab badges. A failure here only hides the badges.
  const token = await getUserToken();
  const leads = token ? await getMyLeads(token).catch(() => []) : [];
  const unreadReplies = leads.reduce((n, lead) => n + lead.replies.filter((r) => !r.read).length, 0);

  const memberId = `TCP-U-${user.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My account" }]} />

      <header className="mt-6 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-2xl font-bold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a Google profile photo, not worth the image optimizer
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            user.name.trim().charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-ink sm:text-3xl">{user.name}</h1>
          <p className="truncate text-sm text-ink-soft">
            {user.email}
            {user.authProvider === "google" && " · Google account"}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            Member ID <span className="font-mono font-semibold text-ink-soft">{memberId}</span>
          </p>
        </div>
      </header>

      <AccountTabs enquiries={leads.length} unreadReplies={unreadReplies} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
