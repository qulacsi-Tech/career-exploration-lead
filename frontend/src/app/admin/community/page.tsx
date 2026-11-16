import { withAdminToken } from "@/lib/admin-session";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { CommunityAdmin, type CommunityTab } from "@/components/admin/community-admin";
import { adminCommunityOverview, adminCommunityPosts, adminCommunityUsers } from "@/lib/community-api";

/*
  Server component: what is happening in the exam communities. Three views, chosen in the address so a filtered
  view can be shared: Posts (every post and reply, hidden ones too), People (everyone taking part, with their
  standing), Communities (one per exam). The platform team only: the proxy keeps college admins out.
*/
export default async function AdminCommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const tab: CommunityTab = one("tab") === "people" ? "people" : one("tab") === "communities" ? "communities" : "posts";
  const page = Math.max(1, Number(one("page")) || 1);
  const filters = { community: one("community"), status: one("status"), kind: one("kind"), q: one("q"), user: one("user"), page };

  const overview = await withAdminToken((t) => adminCommunityOverview(t));
  const posts = tab === "posts" ? await withAdminToken((t) => adminCommunityPosts(t, filters)) : null;
  const people = tab === "people" ? await withAdminToken((t) => adminCommunityUsers(t, { status: filters.status, q: filters.q, page })) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community"
        description="What students post in the exam communities. Hide or delete posts and replies, restrict a community, and flag or block a student. A blocked student can still read but cannot post, reply, react or join."
      />
      <CommunityAdmin tab={tab} filters={filters} overview={overview} posts={posts} people={people} />
    </div>
  );
}
