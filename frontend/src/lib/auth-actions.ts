"use server";

import { redirect } from "next/navigation";
import { loginUser } from "@/lib/api";
import { clearAdminSession, setAdminSession } from "@/lib/admin-session";

export type SignInState = { error?: string } | undefined;

/**
 * Signs in and, for an ADMIN account, stores the session.
 *
 * The check is on the role the backend returned, not on anything the form sent.
 * A student account can sign in here, but it gets no admin session. The error
 * is generic on purpose: it does not say whether the email exists.
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) return { error: "Enter your email and password." };

  let result: Awaited<ReturnType<typeof loginUser>>;
  try {
    result = await loginUser({ email, password });
  } catch {
    return { error: "Could not sign in. Check your details and try again." };
  }

  if (result.user.role !== "ADMIN") {
    return { error: "This account does not have admin access." };
  }

  await setAdminSession(result.accessToken, remember);
  // redirect() throws to end the action, so it sits outside the try block above.
  redirect("/admin");
}

/** Ends the admin session and returns to the login screen. */
export async function signOut() {
  await clearAdminSession();
  redirect("/login");
}
