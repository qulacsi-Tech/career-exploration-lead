import { adminGetCollectionOptions, adminGetCollections } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { CollectionsAdmin } from "@/components/admin/collections-admin";

/*
  Server component: every collection, published or not, and the options the
  editor chooses from (scope, colleges, ranking lists), all from the admin API.
*/
export default async function AdminCollectionsPage() {
  const [collections, options] = await withAdminToken((token) =>
    Promise.all([adminGetCollections(token), adminGetCollectionOptions(token)]),
  );
  return <CollectionsAdmin collections={collections} options={options} />;
}
