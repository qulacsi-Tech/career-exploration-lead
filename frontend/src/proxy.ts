import { NextResponse, type NextRequest } from "next/server";

/*
  Keeps the admin session alive. When the access token is about to expire, the
  proxy swaps it for a fresh one through the backend's refresh endpoint and sets
  the new cookie on the response. Server components cannot set cookies, which is
  why this runs here rather than in the admin layout.

  The token's signature is not checked here. That is the backend's job on every
  request. This only reads the expiry to decide whether to refresh. A token that
  is already expired is left alone, and the admin page's 401 handling sends the
  visitor to log in.

  The cookie names and lifetime mirror lib/admin-session.ts. They are repeated
  here because that module imports next/headers, which the proxy cannot use.
*/

const SESSION_COOKIE = "tcp_admin_token";
const REMEMBER_COOKIE = "tcp_admin_remember";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const REFRESH_WITHIN_SECONDS = 5 * 60;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** The `exp` claim of a JWT, read without verifying it. Null when unreadable. */
function tokenExpiry(token: string): number | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  const exp = tokenExpiry(token);
  const now = Math.floor(Date.now() / 1000);
  if (exp === null || exp <= now || exp - now > REFRESH_WITHIN_SECONDS) {
    return NextResponse.next();
  }

  let fresh: string | null = null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { accessToken?: string } };
      fresh = json.data?.accessToken ?? null;
    }
  } catch {
    fresh = null;
  }
  if (!fresh) return NextResponse.next();

  const response = NextResponse.next();
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  response.cookies.set(SESSION_COOKIE, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
