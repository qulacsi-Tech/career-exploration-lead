import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password — TopCollegePath",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
