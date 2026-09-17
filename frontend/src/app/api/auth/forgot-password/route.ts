import { NextResponse } from "next/server";

/**
 * Password reset request.
 *
 * ## Always answers the same way
 *
 * Whether or not the address belongs to an account, this returns the same
 * success response. Replying "no such user" would turn the endpoint into an
 * account-enumeration oracle: anyone could test an email list against it and
 * learn who is registered here, which is exactly the list a credential-stuffing
 * run wants. The wording in the UI matches — "if that email is registered".
 *
 * When the backend lands: look the user up, mint a single-use token with a
 * short expiry (an hour is typical), store its hash rather than the token, and
 * email the link. The response below does not change.
 */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // The one case worth rejecting: a malformed address cannot belong to anyone,
  // so saying so leaks nothing and saves a pointless wait.
  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, errors: { email: "Enter the email address on your account." } },
      { status: 422 }
    );
  }

  console.info("Password reset requested (no mailer configured)", {
    email,
    requestedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
