import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { getAuthCopy } from "@/lib/auth-page";

export const metadata: Metadata = {
  title: "Forgot password — TopCollegePath",
  robots: { index: false, follow: false },
};

/** Forgot password: a six-digit code is emailed to the account, then the person chooses a new password. */
export default async function ForgotPasswordPage() {
  const copy = await getAuthCopy("login");
  return (
    <AuthShell copy={copy}>
      <ForgotPasswordView />
    </AuthShell>
  );
}
