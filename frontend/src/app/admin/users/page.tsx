import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { CreateAdministrator } from "@/components/admin/create-administrator";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { adminListUsers, adminUserCounts, getMe, type UserGroup } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";
import { isSuperAdmin, roleLabel } from "@/lib/roles";

const PAGE_SIZE = 25;

const TABS: { group: UserGroup; label: string; blurb: string }[] = [
  { group: "general", label: "General accounts", blurb: "Students and visitors who signed up on the site, by email or with Google." },
  { group: "administrative", label: "Administrative accounts", blurb: "Admins and super admins who can use this panel." },
];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/*
  Server component. Each tab is its own paginated query on the API, so a large list never loads
  at once. The tab, search and page live in the URL, so any view can be bookmarked.

  Who can change what is decided by the API from the signed-in admin's current role. This page
  only hides the controls that would be refused: a super admin sees everything; an admin can
  enable or disable general accounts and can read, but not change, the administrative list.
*/
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const group: UserGroup = first(params.tab) === "administrative" ? "administrative" : "general";
  const q = first(params.q)?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const [{ data: users, meta }, counts, me] = await withAdminToken((token) =>
    Promise.all([adminListUsers(token, { group, page, limit: PAGE_SIZE, q }), adminUserCounts(token), getMe(token)]),
  );
  const superAdmin = isSuperAdmin(me.role);
  const active = TABS.find((t) => t.group === group)!;

  const href = (tab: UserGroup, nextPage = 1, search = q) => {
    const qs = new URLSearchParams();
    if (tab !== "general") qs.set("tab", tab);
    if (search) qs.set("q", search);
    if (nextPage > 1) qs.set("page", String(nextPage));
    return qs.size ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Open an account to see its enquiries and activity."
        actions={superAdmin ? <CreateAdministrator /> : undefined}
      />

      <nav aria-label="Account type" className="flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <Link
            key={tab.group}
            href={href(tab.group, 1, undefined)}
            aria-current={tab.group === group ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab.group === group ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-brand"
            }`}
          >
            {tab.label}
            <span className="rounded-full bg-bg-alt px-2 py-0.5 text-[11px] font-bold text-ink-soft">{counts[tab.group]}</span>
          </Link>
        ))}
      </nav>

      <form action="/admin/users" className="flex gap-2">
        {group !== "general" && <input type="hidden" name="tab" value={group} />}
        <label htmlFor="user-search" className="sr-only">
          Search {active.label.toLowerCase()}
        </label>
        <input
          id="user-search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Search
        </button>
        {q && (
          <Link href={href(group, 1, undefined)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
            Clear
          </Link>
        )}
      </form>

      <AdminSection
        title={`${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "account" : "accounts"}`}
        description={
          group === "administrative" && !superAdmin
            ? `${active.blurb} Only a super admin can change these.`
            : active.blurb
        }
      >
        {users.length === 0 ? (
          <p className="text-sm text-ink-soft">{q ? "No accounts match." : "No accounts yet."}</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Email</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{group === "administrative" ? "Role" : "Signed up with"}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Joined</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Last sign-in</th>
                  {group === "general" && <th scope="col" className="py-2 pr-3 text-right font-semibold">Enquiries</th>}
                  <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                  <th scope="col" className="py-2 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3 pr-3 font-medium text-ink">
                      <Link href={`/admin/users/${user.id}`} className="hover:text-brand hover:underline">
                        {user.name}
                      </Link>
                      {user.id === me.id && <span className="ml-2 text-xs font-normal text-ink-faint">(you)</span>}
                    </td>
                    <td className="py-3 pr-3 text-ink-soft">{user.email}</td>
                    <td className="py-3 pr-3 text-ink-soft">
                      {group === "administrative" ? (
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                            user.role === "SUPER_ADMIN" ? "border-gold/40 bg-gold-soft text-gold" : "border-line bg-bg-alt text-ink-soft"
                          }`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      ) : user.authProvider === "google" ? (
                        "Google"
                      ) : (
                        "Email"
                      )}
                    </td>
                    <td className="py-3 pr-3 text-ink-faint">{formatFull(user.createdAt)}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatFull(user.lastLoginAt)}</td>
                    {group === "general" && <td className="py-3 pr-3 text-right tabular-nums text-ink-soft">{user.leadCount}</td>}
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                          user.isActive ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg text-ink-faint"
                        }`}
                      >
                        {user.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3">
                      {user.canManage && user.id !== me.id && (
                        <UserActiveToggle id={user.id} isActive={user.isActive} name={user.name} compact />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {meta.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm text-ink-soft">
          {meta.page > 1 ? (
            <Link href={href(group, meta.page - 1)} className="font-medium text-brand hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {meta.page} of {meta.pages}
          </span>
          {meta.page < meta.pages ? (
            <Link href={href(group, meta.page + 1)} className="font-medium text-brand hover:underline">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
