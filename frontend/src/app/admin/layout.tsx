import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

/*
  /admin sits outside the (site) route group, so it inherits only the root
  layout — no marketing header or footer, which is why the group split exists.
*/
export const metadata: Metadata = {
  title: "Admin — TopCollegePath",
  // The panel must never be indexed, whatever the public site's SEO does.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
