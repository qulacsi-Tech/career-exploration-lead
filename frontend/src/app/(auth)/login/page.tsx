import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in — TopCollegePath",
  robots: { index: false, follow: false },
};

/*
  Server component so the page can export metadata; the form itself is a client
  component because it routes on submit.

  Two audiences share this screen — students saving shortlists, and the admin
  team — so it stays a single form rather than a separate admin login.
*/
export default function LoginPage() {
  return <LoginForm />;
}
