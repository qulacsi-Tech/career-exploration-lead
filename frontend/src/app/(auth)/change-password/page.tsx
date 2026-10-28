import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AuthCard } from "@/components/auth/auth-card";
import { getAdminToken } from "@/lib/admin-session";
import { getUserToken } from "@/lib/user-session";

export const metadata: Metadata = {
  title: "Choose a new password — TopCollegePath",
  robots: { index: false, follow: false },
};

/**
 * Where someone lands first after signing in with a temporary password: a new college admin, or
 * anyone whose password the team reset. The panel stays closed until they replace it. It sits outside /admin so
 * the admin layout's own redirect to here cannot loop.
 */
export default async function ChangePasswordPage() {
  // Anyone given a temporary password lands here: a student, or a college admin or other staff.
  if (!(await getUserToken()) && !(await getAdminToken())) redirect("/login");
  return (
    <AuthCard>
      <ChangePasswordForm />
    </AuthCard>
  );
}
