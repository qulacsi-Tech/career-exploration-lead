import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account — TopCollegePath",
  description: "Shortlist colleges, save comparisons and track the exams you are preparing for.",
  // Nothing to rank for, and an indexed sign-up page competes with the content
  // pages that should be bringing people here in the first place.
  robots: { index: false, follow: true },
};

/**
 * Sign-up, sharing the bare auth layout with /login.
 *
 * Server component so it can export metadata; the form is a client component
 * because it validates, tracks password strength and posts.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
