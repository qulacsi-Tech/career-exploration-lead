"use server";

import { headers } from "next/headers";
import { submitLead } from "@/lib/api";
import { getUserToken } from "@/lib/user-session";

export type EnquiryErrors = Partial<Record<"name" | "phone" | "email" | "stream" | "consent", string>>;

export type EnquiryResult =
  | { ok: true; reference: string }
  | { ok: false; errors?: EnquiryErrors; message?: string };

const PHONE = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** In-memory flood control, per IP. It resets on redeploy; a shared limiter belongs in the API. */
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

/**
 * Receives the enquiry form and passes it to the API.
 *
 * This is a Server Action, not a /api route: in production Caddy sends every
 * /api/* request to the backend, so a Next route under that prefix is never
 * reached. A signed-in student's token goes along, which ties the lead to their
 * account; an anonymous visitor's lead is stored without one.
 *
 * The checks here are a second line behind the form's own. Neither is redundant:
 * the form's are a convenience the client can skip.
 */
export async function submitEnquiry(input: Record<string, unknown>): Promise<EnquiryResult> {
  const str = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");

  // Honeypot: a person never fills the hidden field. Bots get a quiet success.
  if (str("company")) return { ok: true, reference: "TCP-RECEIVED" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return { ok: false, message: "Too many requests. Try again in a minute." };

  const errors: EnquiryErrors = {};
  if (str("name").length < 2) errors.name = "Enter your full name.";
  const phone = str("phone").replace(/[\s\-()]/g, "");
  if (!phone) errors.phone = "Enter a mobile number we can call you on.";
  else if (!PHONE.test(phone)) errors.phone = "That does not look like a valid number.";
  const email = str("email");
  if (!email) errors.email = "Enter an email address.";
  else if (!EMAIL.test(email)) errors.email = "That does not look like a valid email.";
  if (!str("stream")) errors.stream = "Pick the stream you are interested in.";
  if (input.consent !== true) errors.consent = "We need your consent before a counsellor can call.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const source = str("source") || "enquiry-page";
  try {
    const lead = await submitLead(
      {
        name: str("name"),
        phone,
        email,
        collegeSlug: str("collegeSlug") || undefined,
        type: "enquiry",
        stream: str("stream"),
        city: str("city") || undefined,
        message: str("message") || undefined,
        programName: str("programName") || undefined,
        source,
        sourceUrl: str("sourceUrl") || undefined,
        consent: true,
      },
      await getUserToken(),
    );
    return { ok: true, reference: `TCP-${lead.id.slice(0, 8).toUpperCase()}` };
  } catch (error) {
    console.error("Enquiry submission failed", { source, error: error instanceof Error ? error.message : error });
    return { ok: false, message: "We could not submit that just now. Please try again." };
  }
}
