import { adminGetHomepage } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { HomepageSectionsAdmin } from "@/components/admin/homepage-sections-admin";

/*
  Server component: the homepage bands (with their previews) come from the admin
  API with the session token, so the college-band tab shows what is saved.
*/
export default async function AdminHomepageSectionsPage() {
  const homepage = await withAdminToken((token) => adminGetHomepage(token));
  return <HomepageSectionsAdmin homepage={homepage} />;
}
