import { NextResponse } from "next/server";

/**
 * Student sign-up — validates the form then forwards to the FastAPI auth
 * endpoint.  Set REGISTER_FORWARD_URL in .env.local to activate:
 *   REGISTER_FORWARD_URL=http://localhost:8000/api/v1/auth/register
 *
 * Without it the submission is validated and a success is returned so the UI
 * works during local development before the backend is running.
 *
 * Security: the role field is NEVER accepted from the request body — all
 * self-registered accounts get the USER role, enforced server-side.
 */

const FORWARD_URL = process.env.REGISTER_FORWARD_URL;

export type RegisterErrors = Partial<
  Record<"name" | "email" | "phone" | "password" | "confirm" | "terms", string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return "Include at least one letter and one number.";
  return null;
}

function validate(data: Record<string, unknown>): RegisterErrors {
  const errors: RegisterErrors = {};
  const str = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string).trim() : "";

  if (str("name").length < 2) errors.name = "Enter your full name.";

  const email = str("email");
  if (!email) errors.email = "Enter an email address.";
  else if (!emailPattern.test(email)) errors.email = "That does not look like a valid email.";

  const phone = str("phone").replace(/[\s\-()]/g, "");
  if (phone && !phonePattern.test(phone))
    errors.phone = "That does not look like a valid number.";

  const password = typeof data.password === "string" ? data.password : "";
  const problem = passwordProblem(password);
  if (!password) errors.password = "Choose a password.";
  else if (problem) errors.password = problem;

  if (data.confirm !== password) errors.confirm = "Both passwords must match.";
  if (data.terms !== true) errors.terms = "Accept the terms to create an account.";

  return errors;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request." }, { status: 400 });
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // ── Shape payload for FastAPI RegisterSchema ─────────────────────────────
  // Only name, email, password — never role (privilege escalation prevention).
  const backendPayload = {
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    password: String(body.password),
  };

  if (FORWARD_URL) {
    try {
      const upstream = await fetch(FORWARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });

      const upstreamJson = await upstream.json().catch(() => null);

      if (!upstream.ok) {
        // Surface backend validation errors (e.g. email already taken → 409)
        if (upstream.status === 409) {
          return NextResponse.json(
            { ok: false, errors: { email: "An account with this email already exists." } },
            { status: 422 },
          );
        }
        const msg =
          upstreamJson?.error?.message ?? `Registration failed (${upstream.status}).`;
        return NextResponse.json({ ok: false, message: msg }, { status: upstream.status });
      }

      // Forward the access token and user object to the client
      return NextResponse.json({ ok: true, data: upstreamJson?.data ?? null });
    } catch (error) {
      console.error("Register forward failed", {
        name: backendPayload.name,
        email: backendPayload.email,
        error: error instanceof Error ? error.message : error,
      });
      return NextResponse.json(
        { ok: false, message: "We could not create your account just now. Please try again." },
        { status: 502 },
      );
    }
  }

  // No backend configured — log (without password) so the account isn't lost
  console.info("Registration received (no REGISTER_FORWARD_URL configured)", {
    name: backendPayload.name,
    email: backendPayload.email,
    role: "USER",
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
