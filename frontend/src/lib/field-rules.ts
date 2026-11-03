/**
 * What a valid name, email, mobile number and password look like, in one place, so the sign-in dialog, the
 * register page, the enquiry form and the server actions behind them all agree. Each `...Problem` function
 * returns the message to show, or null when the value is fine.
 */

/** An Indian mobile number: 10 digits starting 6 to 9, with an optional +91, 91 or 0 in front. Spaces and dashes are dropped first. */
export const PHONE_RE = /^(?:\+?91|0)?[6-9]\d{9}$/;
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
/** Letters of any script, spaces and the few marks a name uses. No digits or symbols. */
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export const stripPhone = (value: string) => value.replace(/[\s\-()]/g, "");

export function nameProblem(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return "Enter your full name.";
  if (name.length > 80) return "Keep the name under 80 characters.";
  if (!NAME_RE.test(name)) return "Use letters only in the name.";
  return null;
}

export function emailProblem(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter an email address.";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "That does not look like a valid email.";
  return null;
}

export function phoneProblem(value: string, required = false): string | null {
  const phone = stripPhone(value);
  if (!phone) return required ? "Enter your mobile number." : null;
  if (!/^\+?\d+$/.test(phone)) return "Use digits only in the number.";
  if (!PHONE_RE.test(phone)) return "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";
  return null;
}

export function passwordProblem(value: string): string | null {
  if (!value) return "Choose a password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (value.length > 64) return "Use 64 characters or fewer.";
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return null;
}

/**
 * What a mobile number field keeps as it is typed or pasted: digits only, at most 10. A pasted "+91 98765 43210"
 * or "098765 43210" loses its country code or leading zero rather than being cut off at the wrong end.
 */
export function mobileDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** An email address or a 10-digit mobile number (as the sign-in and forgot-password forms take them). */
export function identifierProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address or mobile number.";
  if (v.includes("@")) return emailProblem(v);
  return phoneProblem(v) ?? (stripPhone(v) ? null : "Enter your email address or mobile number.");
}
