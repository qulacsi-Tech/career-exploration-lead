import { cookies, headers } from "next/headers";
import { CONSENT_COOKIE } from "@/lib/analytics-cookies";
import { USER_SESSION_COOKIE } from "@/lib/user-session";

/**
 * The site's own collection point for visitor events.
 *
 * Not under /api: in production Caddy sends everything under /api/* to the
 * backend, and a first-party path is also less likely to be dropped by a content
 * blocker. The browser posts here; this route adds what the browser cannot (the
 * signed-in student's token, which lives in an httpOnly cookie) and forwards the
 * batch to the API.
 *
 * It answers 204 whatever happens: a tracking failure must never be visible on
 * the page. It also re-checks consent, so a stale tab that still has events
 * queued cannot record anything after the visitor has declined.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const MAX_BODY_BYTES = 64 * 1024;

const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    if (jar.get(CONSENT_COOKIE)?.value !== "granted") return NO_CONTENT();

    const body = await request.text();
    if (!body || body.length > MAX_BODY_BYTES) return NO_CONTENT();

    const h = await headers();
    const token = jar.get(USER_SESSION_COOKIE)?.value;

    await fetch(`${API_BASE}/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": h.get("user-agent") ?? "",
        "X-Site-Host": h.get("host") ?? "",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: "no-store",
    });
  } catch {
    /* swallowed on purpose, see above */
  }
  return NO_CONTENT();
}
