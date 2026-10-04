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
/** "1" when the visitor chose "Keep me signed in". Read by the proxy when it refreshes the token. */
export const ADMIN_REMEMBER_COOKIE = "tcp_admin_remember";

/** A cap on the cookie's lifetime. The backend's token expiry still governs access. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

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
 * A 401 means the token has expired or was revoked. A 403 means the account is
 * no longer an admin. Either way the visitor is sent to log in again. Other
 * errors are rethrown unchanged.
 */
export async function withAdminToken<T>(call: (token: string) => Promise<T>): Promise<T> {
  const token = await requireAdminToken();
  try {
    return await call(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect("/login");
    throw err;
  }
}

/**
 * Stores the session. Without `remember`, the cookie lasts only for the browser
 * session; with it, for SESSION_MAX_AGE_SECONDS.
 */
export async function setAdminSession(token: string, remember: boolean) {
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ADMIN_SESSION_COOKIE, token, {
    ...options,
    ...(remember ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
  if (remember) {
    store.set(ADMIN_REMEMBER_COOKIE, "1", { ...options, maxAge: SESSION_MAX_AGE_SECONDS });
  } else {
    store.delete(ADMIN_REMEMBER_COOKIE);
  }
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  store.delete(ADMIN_REMEMBER_COOKIE);
}
