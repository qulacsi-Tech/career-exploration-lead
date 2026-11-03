"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { changeMyPassword, forgotPassword, loginUser, loginWithGoogle, resetPassword, markRepliesRead, registerUser, setMyPassword, updateMe, type AuthResult, type ProfileUpdate } from "@/lib/api";
import { clearAdminSession, setAdminSession } from "@/lib/admin-session";
import { canUsePanel } from "@/lib/roles";
import { PHONE_RE, emailProblem, identifierProblem, nameProblem, passwordProblem, phoneProblem, stripPhone } from "@/lib/field-rules";
import { clearUserSession, getCurrentUser, getUserToken, setUserSession } from "@/lib/user-session";

/** `notFound` is set when no account has that email or mobile number: the form then offers to create one. */
export type SignInState = { error?: string; notFound?: boolean; identifier?: string } | undefined;
export type SignUpState = { error?: string; errors?: Record<string, string> } | undefined;

/**
 * Where to send the visitor after signing in. Only a path on this site is
 * accepted, so a crafted `?next=` cannot turn the login into an open redirect.
 */
function safeNext(value: FormDataEntryValue | string | null | undefined): string | null {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/**
 * Stores the session that matches the account's role and returns where to go.
 *
 * The session lasts until the browser is closed: the cookies carry no expiry, so closing the browser without
 * logging out signs the person out, and there is no sign-out for inactivity while it stays open.
 */
async function startSession(result: AuthResult, next: string | null): Promise<string> {
  const remember = false;
  // The account page greets a first-time visitor differently from a returning one.
  const welcome = result.isNewUser ? "new" : "back";
  // The role is what the backend returned, never anything the form sent.
  // An admin also gets a student session so the public site knows who they are.
  await setUserSession(result.accessToken, remember);
  // A temporary password has to be replaced before anything else: a new college admin lands here first.
  if (result.mustChangePassword) {
    if (canUsePanel(result.user.role)) await setAdminSession(result.accessToken, remember);
    return "/change-password";
  }
  if (canUsePanel(result.user.role)) {
    await setAdminSession(result.accessToken, remember);
    return next?.startsWith("/admin") ? next : "/admin";
  }
  return next ?? `/account?welcome=${welcome}`;
}

/** A backend message is safe to show; a network failure is not worth quoting. */
function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && !(err instanceof TypeError) && err.message ? err.message : fallback;
}

/** Signs in with email and password. Students and admins use the same form. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email or mobile number, and your password." };
  const problem = identifierProblem(email);
  if (problem) return { error: problem };

  let destination: string;
  try {
    destination = await startSession(await loginUser({ email, password }), next);
  } catch (err) {
    if ((err as { code?: string }).code === "ACCOUNT_NOT_FOUND") return { error: messageOf(err, "We could not find an account with that email or mobile number."), notFound: true, identifier: email };
    return { error: messageOf(err, "Could not sign in. Check your details and try again.") };
  }
  // redirect() throws to end the action, so it sits outside the try block above.
  redirect(destination);
}

/** Signs in with the ID token Google handed to the browser. */
export async function signInWithGoogle(idToken: string, nextPath?: string): Promise<SignInState> {
  if (!idToken) return { error: "Google sign-in did not complete. Please try again." };

  let destination: string;
  try {
    const result = await loginWithGoogle(idToken);
    if (process.env.NODE_ENV !== "production") {
      // Dev terminal only, and never the token itself.
      console.info("[Google sign-in] backend accepted it:", result.user);
    }
    destination = await startSession(result, safeNext(nextPath));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[Google sign-in] backend rejected it:", err);
    return { error: messageOf(err, "Google sign-in failed. Please try again.") };
  }
  redirect(destination);
}

const PHONE = PHONE_RE;

/** Creates a student account and signs it in. The role is never read from the form. */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = stripPhone(str("phone"));
  const next = safeNext(formData.get("next"));

  const errors: Record<string, string> = {};
  const problems = { name: nameProblem(str("name")), email: emailProblem(str("email")), phone: phoneProblem(phone), password: passwordProblem(password) };
  for (const [field, problem] of Object.entries(problems)) if (problem) errors[field] = problem;
  if (String(formData.get("confirm") ?? "") !== password) errors.confirm = "Both passwords must match.";
  if (formData.get("terms") !== "on") errors.terms = "Accept the terms to create an account.";
  if (Object.keys(errors).length > 0) return { errors };

  let destination: string;
  try {
    const result = await registerUser({
      name: str("name"),
      email: str("email").toLowerCase(),
      password,
      ...(phone && { phone }),
      marketingConsent: formData.get("marketing") === "on",
    });
    destination = await startSession(result, next);
  } catch (err) {
    if ((err as { code?: string }).code === "EMAIL_ALREADY_EXISTS") {
      return { errors: { email: "An account with this email already exists. Try logging in." } };
    }
    return { error: messageOf(err, "We could not create that account just now. Please try again.") };
  }
  redirect(destination);
}

export type InlineAuthResult = { ok: true; name: string; created: boolean } | { ok: false; error?: string; errors?: Record<string, string>; notFound?: boolean };

/**
 * Opens the student session (and the panel one, for an admin) without choosing a page to go to. The inline
 * sign-in and sign-up in the college pages' dialogs use it, so the visitor stays exactly where they were.
 */
async function openSession(result: AuthResult) {
  await setUserSession(result.accessToken, false);
  if (canUsePanel(result.user.role)) await setAdminSession(result.accessToken, false);
}

/** Signs in from a dialog. A temporary password has to be replaced on the login page first, so that one is not handled here. */
export async function signInInline(email: string, password: string): Promise<InlineAuthResult> {
  if (!email.trim() || !password) return { ok: false, error: "Enter your email or mobile number, and your password." };
  const problem = identifierProblem(email);
  if (problem) return { ok: false, error: problem };
  try {
    const result = await loginUser({ email: email.trim(), password });
    if (result.mustChangePassword) return { ok: false, error: "Sign in on the login page first to choose your new password." };
    await openSession(result);
    return { ok: true, name: result.user.name, created: false };
  } catch (err) {
    if ((err as { code?: string }).code === "ACCOUNT_NOT_FOUND") return { ok: false, notFound: true, error: "We could not find an account with that email or mobile number." };
    return { ok: false, error: messageOf(err, "Could not sign in. Check your details and try again.") };
  }
}

/** Signs in with Google from a dialog: the same as the login page's button, but without leaving the page. */
export async function signInWithGoogleInline(idToken: string): Promise<InlineAuthResult> {
  if (!idToken) return { ok: false, error: "Google sign-in did not complete. Please try again." };
  try {
    const result = await loginWithGoogle(idToken);
    if (result.mustChangePassword) return { ok: false, error: "Sign in on the login page first to choose your new password." };
    await openSession(result);
    return { ok: true, name: result.user.name, created: !!result.isNewUser };
  } catch (err) {
    return { ok: false, error: messageOf(err, "Google sign-in failed. Please try again.") };
  }
}

export type InlineSignUp = { name: string; email: string; phone: string; password: string; confirm: string; terms: boolean; marketing: boolean };

/** Creates an account from a dialog with the same fields as the register page (the rest is filled in on the profile), and signs it in. */
export async function signUpInline(input: InlineSignUp): Promise<InlineAuthResult> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const phone = stripPhone(input.phone);

  const errors: Record<string, string> = {};
  const problems = { name: nameProblem(name), email: emailProblem(email), phone: phoneProblem(phone), password: passwordProblem(input.password) };
  for (const [field, problem] of Object.entries(problems)) if (problem) errors[field] = problem;
  if (input.confirm !== input.password) errors.confirm = "Both passwords must match.";
  if (!input.terms) errors.terms = "Accept the terms to create an account.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const result = await registerUser({ name, email, password: input.password, ...(phone && { phone }), marketingConsent: input.marketing });
    await openSession(result);
    return { ok: true, name: result.user.name, created: true };
  } catch (err) {
    if ((err as { code?: string }).code === "EMAIL_ALREADY_EXISTS") {
      return { ok: false, errors: { email: "An account with this email already exists. Try logging in." } };
    }
    return { ok: false, error: messageOf(err, "We could not create that account just now. Please try again.") };
  }
}

/** Saves the profile form on /account. */
export async function saveProfile(
  _prev: { error?: string; saved?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const token = await getUserToken();
  if (!token) redirect("/login?next=/account");

  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const phone = str("phone").replace(/[\s\-()]/g, "");
  if (str("name").length < 2) return { error: "Enter your full name." };
  if (phone && !PHONE.test(phone)) return { error: "That does not look like a valid number." };

  const update: ProfileUpdate = {
    name: str("name"),
    phone: phone || null,
    city: str("city") || null,
    state: str("state") || null,
    preferredStream: str("preferredStream") || null,
    targetExam: str("targetExam") || null,
    marketingConsent: formData.get("marketingConsent") === "on",
  };
  try {
    await updateMe(token, update);
  } catch (err) {
    return { error: messageOf(err, "Could not save your details. Please try again.") };
  }
  return { saved: true };
}

export type SessionUser = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  preferredStream: string | null;
  state: string | null;
  city: string | null;
  targetExam: string | null;
};

/** Who is signed in, for the site header and to prefill forms. Null when nobody is, or the session has lapsed. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user
    ? {
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        preferredStream: user.preferredStream,
        state: user.state,
        city: user.city,
        targetExam: user.targetExam,
      }
    : null;
}

/** Marks the signed-in student's replies as read, when they open the Replies tab. */
export async function markRepliesSeen(): Promise<void> {
  const token = await getUserToken();
  if (token) await markRepliesRead(token).catch(() => undefined);
}

export type PasswordFormState = { error?: string; saved?: number } | undefined;

const PASSWORD_RULE = "The password needs at least 8 characters, with a letter and a number.";
const passwordOk = (p: string) => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);

/** Changes the signed-in person's password. For an account that already has one. */
export async function changeOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const token = await getUserToken();
  if (!token) redirect("/login?next=/account");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!current) return { error: "Enter your current password." };
  if (!passwordOk(next)) return { error: PASSWORD_RULE };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords do not match." };

  try {
    await changeMyPassword(token, current, next);
  } catch (err) {
    return { error: messageOf(err, "Could not change the password. Try again.") };
  }
  return { saved: Date.now() };
}

/**
 * Adds a password to an account made with Google. They can then sign in with their email and that
 * password as well as with Google. The session they are in proves who they are, so no current
 * password is asked for: there is none.
 */
export async function setOwnPassword(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const token = await getUserToken();
  if (!token) redirect("/login?next=/account");

  const next = String(formData.get("next") ?? "");
  if (!passwordOk(next)) return { error: PASSWORD_RULE };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The two passwords do not match." };

  try {
    await setMyPassword(token, next);
  } catch (err) {
    return { error: messageOf(err, "Could not set the password. Try again.") };
  }
  revalidatePath("/account");
  return { saved: Date.now() };
}

/** Ends every session and returns to the login screen. */
export async function signOut() {
  await clearAdminSession();
  await clearUserSession();
  redirect("/login");
}

/** Emails a six-digit code to the account for a forgotten password. The answer is the same whether or not there is one. */
export async function requestPasswordReset(identifier: string): Promise<{ ok: true; message: string; devCode?: string } | { ok: false; error: string }> {
  const problem = identifierProblem(identifier);
  if (problem) return { ok: false, error: problem };
  try {
    return { ok: true, ...(await forgotPassword(identifier.trim())) };
  } catch (err) {
    return { ok: false, error: messageOf(err, "We could not send the code just now. Please try again.") };
  }
}

/** Sets the new password when the code is right. It does not sign anyone in. */
export async function resetPasswordWithCode(identifier: string, code: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = identifierProblem(identifier) ?? passwordProblem(newPassword);
  if (problem) return { ok: false, error: problem };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the six-digit code from the email." };
  try {
    await resetPassword(identifier.trim(), code, newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: messageOf(err, "We could not change the password just now. Please try again.") };
  }
}
