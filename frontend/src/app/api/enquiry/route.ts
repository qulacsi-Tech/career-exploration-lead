import { NextResponse } from "next/server";

/**
 * The leads endpoint.
 *
 * ## What this does and does not do
 *
 * It validates a submission and hands back a reference. It does **not** persist
 * anything yet: the backend has no lead model (`backend/models/` is empty), and
 * writing to the filesystem from a route handler would not survive a deploy.
 * When the API is ready, set `ENQUIRY_FORWARD_URL` and the handler posts the
 * validated payload on — the contract below is the one to build against.
 *
 * Until then a submission is logged with its reference, so a lead captured
 * during a demo is at least recoverable from the server log rather than lost
 * silently while the form says "thank you".
 *
 * ## Why the validation is duplicated here
 *
 * The form validates too, for the error messages. This validates because the
 * form's checks are a convenience a client can skip — anything can POST here.
 */

const FORWARD_URL = process.env.ENQUIRY_FORWARD_URL;

export type EnquiryErrors = Partial<Record<"name" | "phone" | "email" | "stream" | "consent", string>>;

/** Digits only, then 10 for an Indian mobile or 8-15 for anything international. */
const phonePattern = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(data: Record<string, unknown>): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string).trim() : "");

  if (str("name").length < 2) errors.name = "Enter your full name.";

  const phone = str("phone").replace(/[\s-()]/g, "");
  if (!phone) errors.phone = "Enter a mobile number we can call you on.";
  else if (!phonePattern.test(phone)) errors.phone = "That does not look like a valid number.";

  const email = str("email");
  if (!email) errors.email = "Enter an email address.";
  else if (!emailPattern.test(email)) errors.email = "That does not look like a valid email.";

  if (!str("stream")) errors.stream = "Pick the stream you are interested in.";
  if (data.consent !== true) errors.consent = "We need your consent before a counsellor can call.";

  return errors;
}

/**
 * Crude flood control, keyed by IP.
 *
 * In-memory, so it resets on redeploy and is per-instance on a serverless
 * platform — it stops a script hammering one box, not a distributed flood. Real
 * rate limiting belongs at the edge or in shared storage; this is the version
 * that costs nothing and is better than none.
 */
const RATE_LIMIT = { windowMs: 60_000, max: 5 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

/** Short, human-quotable reference: TCP-<base36 time>-<random>. */
function reference() {
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
      { status: 429 }
    );
  }

  // Honeypot: a field no human sees, so anything filling it is a bot. Answered
  // with a success shape on purpose — telling a scraper it was detected only
  // teaches it to avoid the trap next time.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true, reference: reference() });
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const lead = {
    reference: reference(),
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    email: String(body.email).trim(),
    stream: String(body.stream),
    city: typeof body.city === "string" ? body.city : "",
    message: typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "",
    source: typeof body.source === "string" ? body.source : "enquiry-page",
    submittedAt: new Date().toISOString(),
  };

  if (FORWARD_URL) {
    try {
      const upstream = await fetch(FORWARD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });

      if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
    } catch (error) {
      // The lead is worth more than the tidy failure: log it in full so it can
      // be recovered by hand, and tell the visitor honestly.
      console.error("Enquiry forward failed", { lead, error });
      return NextResponse.json(
        { ok: false, message: "We could not submit that just now. Please try again." },
        { status: 502 }
      );
    }
  } else {
    console.info("Enquiry received (no forward configured)", lead);
  }

  return NextResponse.json({ ok: true, reference: lead.reference });
}
