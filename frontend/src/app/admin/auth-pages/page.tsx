import { adminGetAuthPage } from "@/lib/api";
import { withAdminToken } from "@/lib/admin-session";
import { AuthPagesAdmin } from "@/components/admin/auth-pages-admin";

/*
  Server component: the words and the picture of the log in and sign up pages, as saved, and the original
  wording to reset to. Read through the admin API with the session token.
*/
export default async function AdminAuthPagesPage() {
  const { login, signup, defaults } = await withAdminToken((token) => adminGetAuthPage(token));
  return <AuthPagesAdmin initial={{ login, signup }} defaults={defaults} />;
}
