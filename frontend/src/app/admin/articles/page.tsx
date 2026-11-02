import { redirect } from "next/navigation";

/** The News screen used to live here; old bookmarks and links still arrive. */
export default function AdminArticlesRedirect() {
  redirect("/admin/news");
}
