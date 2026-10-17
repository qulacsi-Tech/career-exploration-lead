import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getAdminToken } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Choose a new password — TopCollegePath",
  robots: { index: false, follow: false },
};

/**
 * Where a new college admin lands first. Their account was created with a temporary
 * password; the panel stays closed until they replace it. It sits outside /admin so
 * the admin layout's own redirect to here cannot loop.
 */
export default async function ChangePasswordPage() {
  if (!(await getAdminToken())) redirect("/login");
  return <ChangePasswordForm />;
}
