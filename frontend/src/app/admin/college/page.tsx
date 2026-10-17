import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-section";
import { MyCollege } from "@/components/admin/my-college";
import { getMe } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { isCollegeAdmin } from "@/lib/roles";

/*
  A college admin's own college. For now it is view only: everything the public page shows, in the
  same tabs the platform team edits. Changes will be sent for approval and appear on the site once
  the platform team approves them.
*/
export default async function MyCollegePage() {
  const me = await withAdminToken((token) => getMe(token));
  // The platform team has the full college list; this page is for a college admin.
  if (!isCollegeAdmin(me.role) || !me.collegeSlug) redirect("/admin/colleges");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Your college" description="Everything shown on your college page. View only for now." />

      <AdminSection
        title="College record"
        description="Info, courses and fees, admissions, placements, cut-offs, gallery, faculty and more, in the tabs the public page uses."
        actions={
          <Link
            href={`/college/${me.collegeSlug}`}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand hover:text-brand"
          >
            View public page
          </Link>
        }
      >
        <MyCollege slug={me.collegeSlug} />
      </AdminSection>
    </div>
  );
}
