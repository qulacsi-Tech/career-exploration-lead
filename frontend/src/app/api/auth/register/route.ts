import { NextResponse } from "next/server";

/**
 * Student sign-up.
 *
 * ## Nothing is persisted yet — and that is deliberate, not forgotten
 *
 * `backend/models/` has no user model, there is no password hashing, no session
 * and no email verification. Rather than fake any of that, this validates the
 * submission and returns success; the UI says plainly that accounts go live
 * with the admin module.
 *
 * When the backend lands, this handler needs, in order:
 *   1. a uniqueness check on email (409 if taken),
 *   2. `argon2`/`bcrypt` hashing — never store or forward the raw password,
 *   3. the user row created with role `student`, and
 *   4. a verification email before the account can sign in.
 *
 * Per the 15 Sep MoM, self-registration creates a **student** only. Admin,
 * Super Admin and College Admin accounts are created from the admin module, so
 * no role is accepted from the request body — a client-supplied role here would
 * be a privilege-escalation hole the day roles start meaning something.
 */

export type RegisterErrors = Partial<
  Record<"name" | "email" | "phone" | "password" | "confirm" | "terms", string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/;

/** Length plus at least one letter and one digit — the floor, not a policy. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return "Include at least one letter and one number.";
  return null;
}

function validate(data: Record<string, unknown>): RegisterErrors {
  const errors: RegisterErrors = {};
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string).trim() : "");

  if (str("name").length < 2) errors.name = "Enter your full name.";

  const email = str("email");
  if (!email) errors.email = "Enter an email address.";
  else if (!emailPattern.test(email)) errors.email = "That does not look like a valid email.";

  // Optional, but validated when given: a wrong number is worse than none.
  const phone = str("phone").replace(/[\s-()]/g, "");
  if (phone && !phonePattern.test(phone)) errors.phone = "That does not look like a valid number.";

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

  // Logged so a sign-up during review is not lost — deliberately without the
  // password, which must never reach a log, a metric or an error report.
  console.info("Registration received (no user store configured)", {
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    role: "student",
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
