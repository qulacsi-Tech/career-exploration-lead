import { NextResponse } from "next/server";

/**
 * Enquiry / lead-capture endpoint.
 *
 * Validates the submission, applies rate limiting and honeypot protection,
 * then forwards a shaped payload to the FastAPI backend.
 *
 * Set ENQUIRY_FORWARD_URL in .env.local to activate forwarding:
 *   ENQUIRY_FORWARD_URL=http://localhost:8000/api/v1/leads
 *
 * Without it, submissions are logged to the server console so nothing is lost
 * during development / review.
 */

const FORWARD_URL = process.env.ENQUIRY_FORWARD_URL;

export type EnquiryErrors = Partial<
  Record<"name" | "phone" | "email" | "stream" | "consent", string>
>;

const phonePattern = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(data: Record<string, unknown>): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const str = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string).trim() : "";

  if (str("name").length < 2) errors.name = "Enter your full name.";

  const phone = str("phone").replace(/[\s\-()]/g, "");
  if (!phone) errors.phone = "Enter a mobile number we can call you on.";
  else if (!phonePattern.test(phone)) errors.phone = "That does not look like a valid number.";

  const email = str("email");
  if (!email) errors.email = "Enter an email address.";
  else if (!emailPattern.test(email)) errors.email = "That does not look like a valid email.";

  if (!str("stream")) errors.stream = "Pick the stream you are interested in.";
  if (data.consent !== true)
    errors.consent = "We need your consent before a counsellor can call.";

  return errors;
}

/** In-memory flood control — per-IP, resets on redeploy. */
const RATE_LIMIT = { windowMs: 60_000, max: 5 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

function reference(): string {
  return `TCP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  // Honeypot — silent success for bots
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true, reference: reference() });
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const ref = reference();

  // ── Shape the payload for the FastAPI LeadCreateSchema ──────────────────
  // The enquiry form collects: name, phone, email, stream, city, message.
  // The backend wants:        name, phone, email?, collegeSlug?, type.
  const backendPayload = {
    name: String(body.name).trim(),
    phone: String(body.phone).replace(/[\s\-()]/g, ""),
    email: typeof body.email === "string" ? body.email.trim() : undefined,
    // collegeSlug may be passed by the form on a college detail page
    collegeSlug:
      typeof body.collegeSlug === "string" ? body.collegeSlug : undefined,
    type: "enquiry" as const,
  };

  if (FORWARD_URL) {
    try {
      const upstream = await fetch(FORWARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });

      if (!upstream.ok) {
        const errBody = await upstream.text().catch(() => "");
        throw new Error(`Backend responded ${upstream.status}: ${errBody}`);
      }
    } catch (error) {
      // Log everything so a lead during demo/review is recoverable
      console.error("Enquiry forward failed", {
        ref,
        payload: backendPayload,
        error: error instanceof Error ? error.message : error,
      });
      return NextResponse.json(
        { ok: false, message: "We could not submit that just now. Please try again." },
        { status: 502 },
      );
    }
  } else {
    // No backend configured — log locally so nothing is silently lost
    console.info("Enquiry received (no ENQUIRY_FORWARD_URL configured)", {
      ref,
      ...backendPayload,
      stream: typeof body.stream === "string" ? body.stream : "",
      city: typeof body.city === "string" ? body.city : "",
      message:
        typeof body.message === "string" ? body.message.trim().slice(0, 500) : "",
      submittedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, reference: ref });
}
