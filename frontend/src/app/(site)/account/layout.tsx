import { redirect } from "next/navigation";
import { AccountTabs } from "@/components/account/account-tabs";
import { getMyLeads, getMyMessages, getMyQuestions, getMyReviews, getMySavedSlugs } from "@/lib/api";
import { getCurrentUser, getUserToken } from "@/lib/user-session";

/**
 * The signed-in student's area as one panel that fits the screen: a compact strip with who they are and a few
 * numbers, a tab bar with icons and counts, and the open section below, which scrolls on its own.
 *
 * Reads the session cookie, so everything under /account renders per request.
 * Without a session the visitor is sent to log in and brought back.
 */
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  // Counts for the tab badges. A failure here only hides the badges.
  const token = await getUserToken();
  const [leads, questions, reviews, savedSlugs, inbox] = token
    ? await Promise.all([
        getMyLeads(token).catch(() => []),
        getMyQuestions(token).catch(() => []),
        getMyReviews(token).catch(() => []),
        getMySavedSlugs(token).catch(() => []),
        getMyMessages(token).catch(() => ({ items: [], unread: 0 })),
      ])
    : [[], [], [], [], { items: [], unread: 0 }];
  const unreadReplies = leads.reduce((n, lead) => n + lead.replies.filter((r) => !r.read).length, 0);

  const memberId = `TCP-U-${user.id.slice(0, 8).toUpperCase()}`;

  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <div className="bg-bg-alt/60">
      {/* On a wide screen the whole account fits the screen under the site header: the profile strip and the tabs
          stay put, and only the open section scrolls. On a phone it flows like a normal page. */}
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-6.25rem)] lg:px-8">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          {/* Who you are, in one compact strip. */}
          <header className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-gradient-to-r from-brand-soft via-bg-alt to-surface px-5 py-4 sm:px-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-white shadow-sm ring-2 ring-white">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a Google profile photo, not worth the image optimizer
                <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-extrabold text-ink sm:text-2xl" title={user.name}>{user.name}</h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                <span className="truncate" title={user.email}>{user.email}</span>
                {user.authProvider === "google" && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-soft">Google account</span>}
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-brand-ink" title="Member ID">{memberId}</span>
              </p>
            </div>
            <dl className="flex divide-x divide-line rounded-2xl bg-white/80 py-1.5 text-center shadow-sm">
              {[
                ["Saved", savedSlugs.length],
                ["Enquiries", leads.length],
                ["Reviews", reviews.length],
              ].map(([label, n]) => (
                <div key={label as string} className="px-4">
                  <dd className="font-display text-lg font-extrabold leading-tight text-brand">{n}</dd>
                  <dt className="text-[11px] font-semibold text-ink-faint">{label}</dt>
                </div>
              ))}
            </dl>
          </header>

          <AccountTabs enquiries={leads.length} unreadReplies={unreadReplies} questions={questions.length} reviews={reviews.length} saved={savedSlugs.length} unreadMessages={inbox.unread} />

          {/* The open section: the only part that scrolls. */}
          <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</main>
        </section>
      </div>
    </div>
  );
}
