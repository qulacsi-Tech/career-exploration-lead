import { adminGetContent, adminGetHomeCopy, adminGetFields, adminGetHeroItems, adminGetGeo, adminGetHomeLocations, adminGetLocationLabels, adminGetLocationPicker, adminGetLinkPool, adminGetNews, adminGetHomepage, adminGetTopExams, adminGetUniversities, adminListPrograms, ApiError } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { HomepageSectionsAdmin } from "@/components/admin/homepage-sections-admin";

/*
  Server component: the college bands, careers panels and data tiles come from the
  admin API with the session token, so each tab shows what is saved.
*/
/** Names the call in the error, so a failing admin request says which one it was. Keeps the status, so a 401 still sends the user to log in. */
function named<T>(name: string, call: Promise<T>): Promise<T> {
  return call.catch((err) => {
    throw err instanceof ApiError ? new ApiError(err.status, `${name}: ${err.message}`) : err;
  });
}

export default async function AdminHomepageSectionsPage() {
  const [homepage, careers, highlights, topExams, copy, programs, universities, locations, geo, locationLabels, fieldList, hero, picker, linkPool, news] = await withAdminToken((token) =>
    Promise.all([
      named("homepage bands", adminGetHomepage(token)),
      named("careers", adminGetContent(token, "careers")),
      named("highlights", adminGetContent(token, "highlights")),
      named("top exams", adminGetTopExams(token)),
      named("home copy", adminGetHomeCopy(token)),
      named("programs", adminListPrograms(token)),
      named("universities", adminGetUniversities(token)),
      named("home locations", adminGetHomeLocations(token)),
      named("geo", adminGetGeo(token)),
      named("location labels", adminGetLocationLabels(token)),
      named("fields", adminGetFields(token)),
      named("hero items", adminGetHeroItems(token)),
      named("location picker", adminGetLocationPicker(token)),
      named("link pool", adminGetLinkPool(token)),
      named("news", adminGetNews(token)),
    ]),
  );
  return (
    <HomepageSectionsAdmin
      homepage={homepage}
      careers={careers.items as import("@/components/admin/home-content-managers").PanelDraft[]}
      highlights={highlights.items as import("@/components/admin/home-content-managers").TileDraft[]}
      topExams={topExams}
      copy={copy}
      programs={programs}
      universities={universities}
      locations={locations}
      geo={geo}
      locationLabels={locationLabels}
      locationPicker={picker}
      linkPool={linkPool}
      news={news}
      fieldList={fieldList}
      heroItems={hero.items}
      heroMax={hero.max}
    />
  );
}
