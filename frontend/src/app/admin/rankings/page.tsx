import { adminGetRankings, getColleges } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { RankingsAdmin } from "@/components/admin/rankings-admin";

/*
  Server component: the ranking lists come from the admin API with the session
  token. The college picker reads the public directory, which is what a ranking
  entry must name.
*/
export default async function AdminRankingsPage() {
  const [lists, directory] = await Promise.all([
    withAdminToken((token) => adminGetRankings(token)),
    getColleges({ limit: 100 }),
  ]);
  const colleges = directory.data.map((c) => ({ slug: c.slug, name: c.name }));
  return <RankingsAdmin lists={lists} colleges={colleges} />;
}
