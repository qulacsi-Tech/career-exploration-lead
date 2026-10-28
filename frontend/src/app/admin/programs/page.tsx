import { adminListOnlineOfferings } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { OnlineOfferingsAdmin } from "@/components/admin/online-offerings-admin";

/*
  Server component: the online programmes colleges have entered on their own records, read through the
  admin API with the session token. Nothing is added here; each can be switched on or off.
*/
export default async function AdminProgramsPage() {
  const offerings = await withAdminToken((token) => adminListOnlineOfferings(token));
  return <OnlineOfferingsAdmin offerings={offerings} />;
}
