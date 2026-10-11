import { adminGetFields, adminGetLocationPicker, adminGetNews } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { AdminPageHeader } from "@/components/admin/admin-section";
import { NewsManager } from "@/components/admin/news-manager";

/*
  Server component: every article, and which ones the homepage news spread pins.

  The same manager as Sections > Homepage > Articles, so the list, the editor dialog and the
  pinning behave the same on both screens. This one is for working on the articles themselves;
  the homepage tab also has the heading words for the news block.
*/
export default async function AdminArticlesPage() {
  const [news, fields, picker] = await withAdminToken((token) =>
    Promise.all([adminGetNews(token), adminGetFields(token), adminGetLocationPicker(token)]),
  );
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Articles"
        description="Every article on the site: write, publish or unpublish, edit and delete. Pinning decides which ones the homepage news shows."
      />
      <NewsManager news={news} categories={fields.map((f) => f.name)} picker={picker} />
    </div>
  );
}
