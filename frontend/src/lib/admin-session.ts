import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";

/**
 * Admin session, held in an httpOnly cookie.
 *
 * The token never reaches browser JavaScript, so it cannot be read by a script
 * on the page. Only server code reads it: the admin layout and the admin pages,
 * which pass it to the API as a Bearer header.
 *
 * Cookies can be written only from a Server Action or Route Handler, so the
 * helpers that set or clear the cookie are called from actions in
 * lib/auth-actions.ts. The read helpers here are safe in a Server Component.
 */

export const ADMIN_SESSION_COOKIE = "tcp_admin_token";

/** A cap on the cookie's lifetime. The backend's token expiry still governs access. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? null;
}

/** The stored token, or a redirect to the login screen when there is none. */
export async function requireAdminToken(): Promise<string> {
  const token = await getAdminToken();
  if (!token) redirect("/login");
  return token;
}

/**
 * Runs an admin API call with the stored token.
 *
 * A 401 means the token has expired or was revoked, so the visitor is sent to
 * log in again. The stale cookie is replaced by the next successful sign-in.
 * Other errors are rethrown unchanged.
 */
export async function withAdminToken<T>(call: (token: string) => Promise<T>): Promise<T> {
  const token = await requireAdminToken();
  try {
    return await call(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }
}

/**
 * Stores the session. Without `remember`, the cookie lasts only for the browser
 * session; with it, for SESSION_MAX_AGE_SECONDS.
 */
export async function setAdminSession(token: string, remember: boolean) {
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}
