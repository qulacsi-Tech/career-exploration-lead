import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getAuthCopy } from "@/lib/auth-page";

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
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const copy = await getAuthCopy("login");
  return (
    <AuthShell copy={copy}>
      <LoginForm
        next={typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined}
        copy={copy}
      />
    </AuthShell>
  );
}
