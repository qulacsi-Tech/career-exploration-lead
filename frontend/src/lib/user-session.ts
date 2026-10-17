import { cookies } from "next/headers";
import { getMe, type Profile } from "@/lib/api";
import { USER_HINT_COOKIE } from "@/lib/user-session-cookie";

/**
 * Student session, held in an httpOnly cookie.
 *
 * Same idea as the admin session (lib/admin-session.ts) and kept separate from
 * it: an admin cookie never makes a visitor a student or the other way round.
 * The token never reaches browser JavaScript. Only server code reads it, and the
 * site header learns who is signed in through the getSessionUser Server Action.
 *
 * Cookies can be written only from a Server Action or Route Handler, so the
 * setters here are called from lib/auth-actions.ts.
 */

export const USER_SESSION_COOKIE = "tcp_user_token";

/** Cookie lifetime for "Keep me signed in". The API's token expiry still governs access, so this matches the production token lifetime. */
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function getUserToken(): Promise<string | null> {
  return (await cookies()).get(USER_SESSION_COOKIE)?.value ?? null;
}

/**
 * The signed-in student's profile, or null when there is no session or the
 * token is no longer accepted. Never throws for an expired session.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const token = await getUserToken();
  if (!token) return null;
  try {
    return await getMe(token);
  } catch {
    return null;
  }
}

/** Without `remember`, the cookie lasts only for the browser session. */
export async function setUserSession(token: string, remember: boolean) {
  const store = await cookies();
  const options = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: USER_SESSION_MAX_AGE_SECONDS } : {}),
  };
  store.set(USER_SESSION_COOKIE, token, { ...options, httpOnly: true });
  store.set(USER_HINT_COOKIE, "1", { ...options, httpOnly: false });
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete(USER_SESSION_COOKIE);
  store.delete(USER_HINT_COOKIE);
}
