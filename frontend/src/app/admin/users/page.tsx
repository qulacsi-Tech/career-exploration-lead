import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { adminListUsers } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { formatFull } from "@/lib/lead-labels";

const PAGE_SIZE = 25;

/*
  Server component: one page of student and admin accounts, with search. The
  search and page live in the URL so a filtered list can be bookmarked.
*/
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(String(Array.isArray(params.page) ? params.page[0] : params.page ?? "1"), 10) || 1);

  const { data: users, meta } = await withAdminToken((token) => adminListUsers(token, { page, limit: PAGE_SIZE, q }));

  const href = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (nextPage > 1) qs.set("page", String(nextPage));
    return qs.size ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" description="Accounts created on the site, by email or with Google. Open one to see their enquiries and activity." />

      <form action="/admin/users" className="flex gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search users
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
          <Link href="/admin/users" className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
            Clear
          </Link>
        )}
      </form>

      <AdminSection title={`${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "user" : "users"}`}>
        {users.length === 0 ? (
          <p className="text-sm text-ink-soft">No users match.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Email</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Signed up with</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Joined</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Last sign-in</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Enquiries</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3 pr-3 font-medium text-ink">
                      <Link href={`/admin/users/${user.id}`} className="hover:text-brand hover:underline">
                        {user.name}
                      </Link>
                      {user.role === "ADMIN" && <span className="ml-2 rounded-md border border-gold/40 bg-gold-soft px-1.5 py-0.5 text-[11px] font-semibold text-gold">Admin</span>}
                    </td>
                    <td className="py-3 pr-3 text-ink-soft">{user.email}</td>
                    <td className="py-3 pr-3 capitalize text-ink-soft">{user.authProvider === "google" ? "Google" : "Email"}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatFull(user.createdAt)}</td>
                    <td className="py-3 pr-3 text-ink-faint">{formatFull(user.lastLoginAt)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-ink-soft">{user.leadCount}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                          user.isActive ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-bg text-ink-faint"
                        }`}
                      >
                        {user.isActive ? "Active" : "Disabled"}
                      </span>
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
            <Link href={href(meta.page - 1)} className="font-medium text-brand hover:underline">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {meta.page} of {meta.pages}
          </span>
          {meta.page < meta.pages ? (
            <Link href={href(meta.page + 1)} className="font-medium text-brand hover:underline">
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
