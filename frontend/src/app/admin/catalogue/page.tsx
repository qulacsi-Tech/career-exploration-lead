import { adminGetCatalogue, adminGetFields } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { CatalogueAdmin, type CatalogueTab } from "@/components/admin/catalogue-admin";

const TABS: CatalogueTab[] = ["categories", "courses", "specialisations"];

/*
  Server component: the three lists a college is described with, read through the admin API
  with the session token. The categories are the homepage fields; the other two come from the
  catalogue.
*/
export default async function AdminCataloguePage({ searchParams }: PageProps<"/admin/catalogue">) {
  const { tab } = await searchParams;
  const [categories, { courses, specialisations }] = await withAdminToken((token) =>
    Promise.all([adminGetFields(token), adminGetCatalogue(token)]),
  );
  const initialTab = TABS.find((t) => t === tab) ?? "categories";
  return <CatalogueAdmin categories={categories} courses={courses} specialisations={specialisations} initialTab={initialTab} />;
}
