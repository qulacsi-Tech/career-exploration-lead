import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminToken } from "@/lib/admin-session";
import { getMe } from "@/lib/api";
import { canUsePanel } from "@/lib/roles";

/*
  /admin sits outside the (site) route group, so it inherits only the root
  layout — no marketing header or footer, which is why the group split exists.
*/
export const metadata: Metadata = {
  title: "Admin — TopCollegePath",
  // The panel must never be indexed, whatever the public site's SEO does.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Every admin route needs a session. Without one, the visitor goes to login.
  const token = await requireAdminToken();

  // Who is signed in, from the API. It decides the sidebar and the name shown. An expired or
  // revoked session ends up at the login screen.
  const me = await getMe(token).catch(() => null);
  if (!me || !canUsePanel(me.role)) redirect("/login");

  // A temporary password has to be replaced before anything else in the panel opens.
  if (me.mustChangePassword) redirect("/change-password");

  return <AdminShell user={{ name: me.name, role: me.role }}>{children}</AdminShell>;
}
