import { getAdminToken } from "@/lib/admin-session";
import { getMe } from "@/lib/api";
import { isCollegeAdmin } from "@/lib/roles";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const STATUSES = new Set(["new", "contacted", "converted", "closed"]);

/**
 * Downloads the leads as a CSV file.
 *
 * A browser cannot send the httpOnly session cookie to the API itself, so the download goes through
 * here: this reads the cookie, asks the right endpoint (the college's own for a college admin, all
 * leads for the platform team) and passes the file straight on. What the person may export is decided
 * by the API from their account, not by anything in this address.
 */
export async function GET(request: Request) {
  const token = await getAdminToken();
  if (!token) return new Response("Sign in to download.", { status: 401 });

  let collegeAdmin: boolean;
  try {
    collegeAdmin = isCollegeAdmin((await getMe(token)).role);
  } catch {
    return new Response("Sign in again to download.", { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status") ?? "";
  const query = STATUSES.has(status) ? `?status=${status}` : "";
  const upstream = await fetch(`${API_BASE}${collegeAdmin ? "/college" : "/admin"}/leads/export.csv${query}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!upstream.ok) return new Response("Could not prepare the file.", { status: upstream.status === 403 ? 403 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
