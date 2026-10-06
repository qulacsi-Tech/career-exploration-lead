import { adminGetContent, adminGetHomeCopy, adminGetFields, adminGetHeroItems, adminGetGeo, adminGetHomeLocations, adminGetLocationLabels, adminGetLocationPicker, adminGetHomepage, adminGetTopExams, adminGetUniversities, adminListPrograms } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { HomepageSectionsAdmin } from "@/components/admin/homepage-sections-admin";

/*
  Server component: the college bands, careers panels and data tiles come from the
  admin API with the session token, so each tab shows what is saved.
*/
export default async function AdminHomepageSectionsPage() {
  const [homepage, careers, highlights, topExams, copy, programs, universities, locations, geo, locationLabels, fieldList, hero, picker] = await withAdminToken((token) =>
    Promise.all([
      adminGetHomepage(token),
      adminGetContent(token, "careers"),
      adminGetContent(token, "highlights"),
      adminGetTopExams(token),
      adminGetHomeCopy(token),
      adminListPrograms(token),
      adminGetUniversities(token),
      adminGetHomeLocations(token),
      adminGetGeo(token),
      adminGetLocationLabels(token),
      adminGetFields(token),
      adminGetHeroItems(token),
      adminGetLocationPicker(token),
    ]),
  );
  return (
    <HomepageSectionsAdmin
      homepage={homepage}
      careers={careers.items as import("@/components/admin/homepage-content-editors").PanelDraft[]}
      highlights={highlights.items as import("@/components/admin/homepage-content-editors").TileDraft[]}
      topExams={topExams}
      copy={copy}
      programs={programs}
      universities={universities}
      locations={locations}
      geo={geo}
      locationLabels={locationLabels}
      locationPicker={picker}
      fieldList={fieldList}
      heroItems={hero.items}
      heroMax={hero.max}
    />
  );
}
