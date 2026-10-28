import { adminGetCatalogue, adminGetCollegePools, adminGetNavMenuConfig, adminGetSiteChrome, getCollectionLinks } from "@/lib/api";
import { getFooterSource } from "@/lib/footer-data";
import { CHROME_DEFAULTS } from "@/lib/site-chrome";
import { withAdminToken } from "@/lib/admin-session";
import { EMPTY_NAV, getMenuSource } from "@/components/colleges-menu-data";
import { getCoursesMenuData } from "@/components/courses-menu-data";
import { NavigationAdmin } from "@/components/admin/navigation-admin";

/*
  Server component: for each header menu, the groups and links the site could put in it (what the
  directory or catalogue holds), what an added category can hold (every published collection, or every
  course and specialisation), and the admin's saved choices on top. The added categories are built in
  the browser from the choices, so they change as they are edited.
*/
export default async function AdminNavigationPage() {
  const [collegeSource, collectionLinks, collegeConfig, courseData, courseConfig, catalogue, pools, chrome, footerSource] = await Promise.all([
    getMenuSource(EMPTY_NAV, false),
    getCollectionLinks().catch(() => []),
    withAdminToken((token) => adminGetNavMenuConfig(token, "colleges")),
    getCoursesMenuData(),
    withAdminToken((token) => adminGetNavMenuConfig(token, "courses")),
    // The courses with the info typed for each (not the cached public list), and the exams the info can name.
    withAdminToken((token) => adminGetCatalogue(token)),
    withAdminToken((token) => adminGetCollegePools(token)).catch(() => null),
    withAdminToken((token) => adminGetSiteChrome(token)).catch(() => CHROME_DEFAULTS),
    getFooterSource(),
  ]);
  return (
    <NavigationAdmin
      colleges={{ source: collegeSource, links: collectionLinks, initial: collegeConfig }}
      courses={{ source: courseData.directory, links: courseData.options, initial: courseConfig }}
      courseInfo={{ courses: catalogue.courses, exams: pools?.exams ?? [] }}
      chrome={{ initial: chrome, source: footerSource }}
    />
  );
}
