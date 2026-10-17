"use server";

import { redirect } from "next/navigation";
import { loginUser, loginWithGoogle, markRepliesRead, registerUser, updateMe, type AuthResult, type ProfileUpdate } from "@/lib/api";
import { clearAdminSession, setAdminSession } from "@/lib/admin-session";
import { clearUserSession, getCurrentUser, getUserToken, setUserSession } from "@/lib/user-session";

export type SignInState = { error?: string } | undefined;
export type SignUpState = { error?: string; errors?: Record<string, string> } | undefined;

/**
 * Where to send the visitor after signing in. Only a path on this site is
 * accepted, so a crafted `?next=` cannot turn the login into an open redirect.
 */
function safeNext(value: FormDataEntryValue | string | null | undefined): string | null {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** Stores the session that matches the account's role and returns where to go. */
async function startSession(result: AuthResult, remember: boolean, next: string | null): Promise<string> {
  // The account page greets a first-time visitor differently from a returning one.
  const welcome = result.isNewUser ? "new" : "back";
  // The role is what the backend returned, never anything the form sent.
  // An admin also gets a student session so the public site knows who they are.
  await setUserSession(result.accessToken, remember);
  if (result.user.role === "ADMIN") {
    await setAdminSession(result.accessToken, remember);
    return next?.startsWith("/admin") ? next : "/admin";
  }
  return next ?? `/account?welcome=${welcome}`;
}

/** A backend message is safe to show; a network failure is not worth quoting. */
function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && !(err instanceof TypeError) && err.message ? err.message : fallback;
}

/** Signs in with email and password. Students and admins use the same form. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };

  let destination: string;
  try {
    destination = await startSession(await loginUser({ email, password }), remember, next);
  } catch (err) {
    return { error: messageOf(err, "Could not sign in. Check your details and try again.") };
  }
  // redirect() throws to end the action, so it sits outside the try block above.
  redirect(destination);
}

/** Signs in with the ID token Google handed to the browser. */
export async function signInWithGoogle(idToken: string, nextPath?: string): Promise<SignInState> {
  if (!idToken) return { error: "Google sign-in did not complete. Please try again." };

  let destination: string;
  try {
    const result = await loginWithGoogle(idToken);
    if (process.env.NODE_ENV !== "production") {
      // Dev terminal only, and never the token itself.
      console.info("[Google sign-in] backend accepted it:", result.user);
    }
    destination = await startSession(result, true, safeNext(nextPath));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[Google sign-in] backend rejected it:", err);
    return { error: messageOf(err, "Google sign-in failed. Please try again.") };
  }
  redirect(destination);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;

/** Creates a student account and signs it in. The role is never read from the form. */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = str("phone").replace(/[\s\-()]/g, "");
  const next = safeNext(formData.get("next"));

  const errors: Record<string, string> = {};
  if (str("name").length < 2) errors.name = "Enter your full name.";
  if (!str("email")) errors.email = "Enter an email address.";
  else if (!EMAIL.test(str("email"))) errors.email = "That does not look like a valid email.";
  if (phone && !PHONE.test(phone)) errors.phone = "That does not look like a valid number.";
  if (!password) errors.password = "Choose a password.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    errors.password = "Include at least one letter and one number.";
  if (String(formData.get("confirm") ?? "") !== password) errors.confirm = "Both passwords must match.";
  if (formData.get("terms") !== "on") errors.terms = "Accept the terms to create an account.";
  if (Object.keys(errors).length > 0) return { errors };

  let destination: string;
  try {
    const result = await registerUser({
      name: str("name"),
      email: str("email").toLowerCase(),
      password,
      ...(phone && { phone }),
      marketingConsent: formData.get("marketing") === "on",
    });
    destination = await startSession(result, true, next);
  } catch (err) {
    if ((err as { code?: string }).code === "EMAIL_ALREADY_EXISTS") {
      return { errors: { email: "An account with this email already exists. Try logging in." } };
    }
    return { error: messageOf(err, "We could not create that account just now. Please try again.") };
  }
  redirect(destination);
}

/** Saves the profile form on /account. */
export async function saveProfile(
  _prev: { error?: string; saved?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const token = await getUserToken();
  if (!token) redirect("/login?next=/account");

  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const phone = str("phone").replace(/[\s\-()]/g, "");
  if (str("name").length < 2) return { error: "Enter your full name." };
  if (phone && !PHONE.test(phone)) return { error: "That does not look like a valid number." };

  const update: ProfileUpdate = {
    name: str("name"),
    phone: phone || null,
    city: str("city") || null,
    state: str("state") || null,
    preferredStream: str("preferredStream") || null,
    targetExam: str("targetExam") || null,
    marketingConsent: formData.get("marketingConsent") === "on",
  };
  try {
    await updateMe(token, update);
  } catch (err) {
    return { error: messageOf(err, "Could not save your details. Please try again.") };
  }
  return { saved: true };
}

export type SessionUser = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  preferredStream: string | null;
};

/** Who is signed in, for the site header and to prefill forms. Null when nobody is, or the session has lapsed. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user
    ? {
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        preferredStream: user.preferredStream,
      }
    : null;
}

/** Marks the signed-in student's replies as read, when they open the Replies tab. */
export async function markRepliesSeen(): Promise<void> {
  const token = await getUserToken();
  if (token) await markRepliesRead(token).catch(() => undefined);
}

/** Ends every session after a period of inactivity, and tells the login page why. */
export async function signOutIdle() {
  await clearAdminSession();
  await clearUserSession();
  redirect("/login?idle=1");
}

/** Ends every session and returns to the login screen. */
export async function signOut() {
  await clearAdminSession();
  await clearUserSession();
  redirect("/login");
}
