import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { MyCollege } from "@/components/admin/my-college";
import { collegeListRequests, getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { isCollegeAdmin } from "@/lib/roles";

/*
  A college admin's own college. They can edit every tab except Reviews, but nothing they change
  reaches the live page: it is sent to the platform team, and appears once an admin approves it.
  One request waits at a time.
*/
export default async function MyCollegePage() {
  const { me, pending } = await withAdminToken(async (token) => {
    const me = await getMe(token);
    if (!isCollegeAdmin(me.role)) return { me, pending: null };
    const requests = await collegeListRequests(token);
    return { me, pending: requests.find((r) => r.status === "pending") ?? null };
  });
  // The platform team has the full college list; this page is for a college admin.
  if (!isCollegeAdmin(me.role) || !me.collegeSlug) redirect("/admin/colleges");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Your college"
        description="Edit what your college page shows, tab by tab. Changes go to the TopCollegePath team for approval and appear on the site once approved. Reviews are written by students and cannot be changed."
        actions={
          <Link
            href={`/college/${me.collegeSlug}`}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            View public page
          </Link>
        }
      />

      {pending && (
        <p role="status" className="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-ink">
          Your {pending.kind === "edit" ? "changes are" : "removal request is"} waiting for review.{" "}
          <Link href="/admin/requests" className="font-semibold text-brand underline-offset-2 hover:underline">
            See the request
          </Link>
          . You can send another once it is decided or withdrawn.
        </p>
      )}

      <MyCollege slug={me.collegeSlug} hasPending={!!pending} />
    </div>
  );
}
