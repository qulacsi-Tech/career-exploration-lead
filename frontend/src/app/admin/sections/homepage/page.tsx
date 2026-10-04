import { adminGetContent, adminGetHomeCopy, adminGetHomepage, adminGetTopExams } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { HomepageSectionsAdmin } from "@/components/admin/homepage-sections-admin";

/*
  Server component: the college bands, careers panels and data tiles come from the
  admin API with the session token, so each tab shows what is saved.
*/
export default async function AdminHomepageSectionsPage() {
  const [homepage, careers, highlights, topExams, copy] = await withAdminToken((token) =>
    Promise.all([
      adminGetHomepage(token),
      adminGetContent(token, "careers"),
      adminGetContent(token, "highlights"),
      adminGetTopExams(token),
      adminGetHomeCopy(token),
    ]),
  );
  return (
    <HomepageSectionsAdmin
      homepage={homepage}
      careers={careers.items as import("@/components/admin/homepage-content-editors").PanelDraft[]}
      highlights={highlights.items as import("@/components/admin/homepage-content-editors").TileDraft[]}
      topExams={topExams}
      copy={copy}
    />
  );
}
