import { rankingLists } from "@/lib/rankings-data";
import { RankingsAdmin } from "@/components/admin/rankings-admin";

export default function AdminRankingsPage() {
  return <RankingsAdmin lists={rankingLists} />;
}
