"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Loader2, Star, X } from "lucide-react";
import { signInInline, signUpInline, type SessionUser } from "@/lib/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/ui/password-input";
import { SiteLogo } from "@/components/site-logo";
import { emailProblem, identifierProblem, mobileDigits, nameProblem, passwordProblem, phoneProblem } from "@/lib/field-rules";
import { PasswordResetFlow } from "@/components/auth/password-reset-flow";
import { getProfileChoices, saveProfileDetails, submitCollegeLead, submitCollegeQuery, submitReview, type ProfileChoices } from "@/lib/college-engage-actions";
import { StateCityFields } from "@/components/admin/state-city-fields";

/**
 * The dialogs behind "Write a review", "Ask a question" and "Ask a counsellor" on a college's pages.
 *
 * Nothing here is open to a visitor who has not signed in: the provider (college-actions.tsx) shows
 * AuthModal first, and only a signed-in student reaches the others. The sign-in and sign-up happen inside
 * the dialog, so the visitor never leaves the page; when they finish, the provider carries on to the
 * dialog they asked for.
 */

const FIELD = "mt-1 w-full rounded-xl border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none";
const fieldClass = (error?: string) => `${FIELD} ${error ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"}`;

const compactField = (error?: string) =>
  `mt-0.5 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${error ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"}`;

function Shell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[5vh]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[min(90vh,50rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-1 truncate text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * The sign-in dialog's frame: narrow, with the site logo over a soft tinted band (the look of the login page),
 * and the title under it. Kept compact so the whole form fits without scrolling on a laptop.
 */
function BrandedShell({ title, subtitle, wide = false, onClose, children }: { title: string; subtitle?: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[96vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(123,26,42,0.55)] ${wide ? "max-w-[27rem]" : "max-w-[22.5rem]"}`}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-soft via-bg-alt to-gold-soft px-6 pb-3 pt-4 text-center">
          <span aria-hidden className="absolute -left-10 -top-12 h-32 w-32 rounded-full bg-brand/15 blur-2xl" />
          <span aria-hidden className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-gold/30 blur-2xl" />
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-soft shadow-sm transition hover:text-brand">
            <X className="h-4 w-4" />
          </button>
          <SiteLogo className="relative mx-auto h-11 w-auto" />
          <h2 className="relative mt-2 font-display text-lg font-extrabold leading-tight text-ink">{title}</h2>
          {subtitle && <p className="relative mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <div className="overflow-y-auto overflow-x-hidden px-6 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function Done({ message, onClose, note, action }: { message: string; onClose: () => void; note?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
      <p className="mt-4 font-display text-lg font-bold text-ink">{message}</p>
      {note && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{note}</p>}
      {action && <div className="mt-5">{action}</div>}
      <button type="button" onClick={onClose} className={`mt-4 rounded-full px-6 py-2.5 text-sm font-bold transition ${action ? "border border-line text-ink-soft hover:border-brand hover:text-brand" : "bg-brand text-white hover:bg-brand-dark"}`}>Done</button>
    </div>
  );
}

const SubmitButton = ({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) => (
  <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70">
    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
    {busy ? busyLabel : label}
  </button>
);

/* ------------------------------------------------------------------ *
   Sign in / create an account
 * ------------------------------------------------------------------ */

/**
 * Asks a visitor to sign in, or to make an account, before they go on. It mirrors the login and register
 * pages: the log in form with Google under it and a link to create an account, and the register form with
 * the same fields. Anything beyond that (city, stream, exam) is filled in later on the profile. When it is
 * done the dialog says so, and then `onDone` returns the visitor to what they were doing.
 */
export function AuthModal({ reason, onAuthed, onDone, onClose }: { reason: string; /** Called the moment sign-in works, before the welcome message, so the page can show who is signed in. */ onAuthed: () => void; onDone: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  // When a log in finds no account, the form turns into sign up with what was typed already in place.
  const [prefill, setPrefill] = useState<{ email: string; phone: string }>({ email: "", phone: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<{ name: string; created: boolean } | null>(null);
  const [pending, start] = useTransition();

  // Once the success message has been read, carry on to what the visitor asked for.
  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  }, [welcome, onDone]);

  const switchTo = (next: "login" | "register" | "forgot") => {
    setMode(next);
    setErrors({});
    setFormError(null);
    setNotice(null);
  };

  // Stable, so Google's button is not set up again on every keystroke.
  const signedIn = useCallback(
    (result: { name: string; created: boolean }) => {
      setWelcome({ name: result.name, created: result.created });
      onAuthed();
    },
    [onAuthed],
  );

  /** What is wrong with one field, or null. Log in only needs the two to be present and the email to look real. */
  const problemWith = (key: string, value: string, all: Record<string, string>): string | null => {
    switch (key) {
      case "name": return nameProblem(value);
      case "email": return mode === "login" ? identifierProblem(value) : emailProblem(value);
      case "phone": return phoneProblem(value);
      case "password": return mode === "login" ? (value ? null : "Enter your password.") : passwordProblem(value);
      case "confirm": return !value ? "Re-enter your password." : value !== all.password ? "Both passwords must match." : null;
      default: return null;
    }
  };
  const fieldsOf = (form: HTMLFormElement) => Object.fromEntries(Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)]));

  /** Checks one field when the visitor leaves it, and keeps re-checking it as they fix it. */
  const checkField = (input: HTMLInputElement, onlyIfShown = false) => {
    if (onlyIfShown && !errors[input.name]) return;
    const all = input.form ? fieldsOf(input.form) : {};
    const problem = problemWith(input.name, input.value, all);
    setErrors((current) => {
      const next = { ...current };
      if (problem) next[input.name] = problem;
      else delete next[input.name];
      return next;
    });
  };

  /** Keeps what cannot be part of the field out of it as it is typed. */
  const only = (pattern: RegExp) => (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cleaned = input.value.replace(pattern, "");
    if (cleaned !== input.value) input.value = cleaned;
    checkField(input, true);
  };
  /** The mobile field takes digits only and stops at 10. */
  const mobileInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cleaned = mobileDigits(input.value);
    if (cleaned !== input.value) input.value = cleaned;
    checkField(input, true);
  };
  const fieldEvents = { onBlur: (e: React.FocusEvent<HTMLInputElement>) => checkField(e.currentTarget), onInput: (e: React.FormEvent<HTMLInputElement>) => checkField(e.currentTarget, true) };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const str = (key: string) => String(form.get(key) ?? "");

    // Everything is checked here first, so a typo never costs a round trip.
    const all = fieldsOf(formEl);
    const found: Record<string, string> = {};
    for (const key of mode === "login" ? ["email", "password"] : ["name", "phone", "email", "password", "confirm"]) {
      const problem = problemWith(key, all[key] ?? "", all);
      if (problem) found[key] = problem;
    }
    if (mode === "register" && form.get("terms") !== "on") found.terms = "Accept the terms to create an account.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      formEl.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }
    start(async () => {
      if (mode === "login") {
        const typed = str("email").trim();
        const result = await signInInline(typed, str("password"));
        if (result.ok) return signedIn({ name: result.name, created: false });
        if (result.notFound) {
          // No account with that email or number: carry on as sign up, with what they typed already filled in.
          setPrefill(typed.includes("@") ? { email: typed, phone: "" } : { email: "", phone: mobileDigits(typed) });
          setMode("register");
          setErrors({});
          setFormError(null);
          return setNotice(`We could not find an account for ${typed}. Create one below. It takes a minute.`);
        }
        return setFormError(result.error ?? "Could not sign in.");
      }
      const result = await signUpInline({
        name: str("name"), email: str("email"), phone: str("phone"),
        password: str("password"), confirm: str("confirm"), terms: form.get("terms") === "on", marketing: form.get("marketing") === "on",
      });
      if (result.ok) return signedIn({ name: result.name, created: true });
      setErrors(result.errors ?? {});
      if (result.error) setFormError(result.error);
    });
  };

  if (welcome) {
    const first = welcome.name.split(" ")[0];
    return (
      <BrandedShell title={welcome.created ? "Account created" : "Signed in"} onClose={onClose}>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
          <p className="mt-4 font-display text-lg font-bold text-ink">{welcome.created ? `Welcome, ${first}! Your account is ready.` : `Welcome back, ${first}!`}</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            {welcome.created ? "One more quick step, and you are done." : "Taking you back to where you were…"}
          </p>
        </div>
      </BrandedShell>
    );
  }

  if (mode === "forgot") {
    return (
      <BrandedShell title="Reset your password" subtitle="We will email you a code to choose a new one." onClose={onClose}>
        <PasswordResetFlow onDone={() => switchTo("login")} />
        <p className="mt-3.5 text-center text-xs text-ink-soft">
          Remembered it?{" "}
          <button type="button" onClick={() => switchTo("login")} className="font-semibold text-ink underline underline-offset-4 hover:text-brand">Log in</button>
        </p>
      </BrandedShell>
    );
  }

  const register = mode === "register";
  return (
    <BrandedShell title={register ? "Create your account" : "Welcome back"} subtitle={reason} wide={register} onClose={onClose}>
      {notice && <p role="status" className="mb-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{notice}</p>}
      {formError && <p role="alert" className="mb-2.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{formError}</p>}

      <form onSubmit={submit} noValidate className="space-y-2.5">
        {register && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field id="ga-name" label="Full name" error={errors.name}>
              <input id="ga-name" name="name" autoComplete="name" maxLength={80} placeholder="Priya Sharma" aria-invalid={!!errors.name} className={compactField(errors.name)} onBlur={fieldEvents.onBlur} onInput={only(/[^\p{L}\p{M} .'’-]/gu)} />
            </Field>
            <Field id="ga-phone" label="Mobile number (optional)" error={errors.phone}>
              <input id="ga-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={18} defaultValue={prefill.phone} placeholder="10-digit mobile number" aria-invalid={!!errors.phone} className={compactField(errors.phone)} onBlur={fieldEvents.onBlur} onInput={mobileInput} />
            </Field>
          </div>
        )}
        <Field id="ga-email" label={register ? "Email" : "Email or mobile number"} error={errors.email}>
          <input key={`email-${mode}`} id="ga-email" name="email" type={register ? "email" : "text"} autoComplete={register ? "email" : "username"} maxLength={254} defaultValue={register ? prefill.email : undefined} placeholder={register ? "you@example.com" : "you@example.com or 9876543210"} aria-invalid={!!errors.email} className={compactField(errors.email)} onBlur={fieldEvents.onBlur} onInput={only(/\s/g)} />
        </Field>
        <div className={register ? "grid gap-2.5 sm:grid-cols-2" : "space-y-2.5"}>
          <Field id="ga-password" label="Password" error={errors.password} hint={register ? "At least 8 characters, with a letter and a number." : undefined}>
            {!register && (
              <button type="button" onClick={() => switchTo("forgot")} className="absolute right-0 top-0 text-xs font-semibold text-brand hover:underline">Forgot password?</button>
            )}
            <PasswordInput id="ga-password" name="password" maxLength={64} placeholder={register ? "Create a password" : "Enter your password"} autoComplete={register ? "new-password" : "current-password"} aria-invalid={!!errors.password} className={compactField(errors.password)} onBlur={fieldEvents.onBlur} onInput={fieldEvents.onInput} />
          </Field>
          {register && (
            <Field id="ga-confirm" label="Confirm password" error={errors.confirm}>
              <PasswordInput id="ga-confirm" name="confirm" maxLength={64} placeholder="Re-enter your password" autoComplete="new-password" aria-invalid={!!errors.confirm} className={compactField(errors.confirm)} onBlur={fieldEvents.onBlur} onInput={fieldEvents.onInput} />
            </Field>
          )}
        </div>

        {register && (
          <>
            <label className="flex items-start gap-2 text-xs text-ink-soft">
              <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand" />
              <span>
                I agree to the <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">terms of use</Link> and <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">privacy policy</Link>.
                {errors.terms && <span className="mt-1 block text-red-700">{errors.terms}</span>}
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-ink-soft">
              <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand" />
              <span>Send me admission updates, exam alerts and counselling offers (optional).</span>
            </label>
          </>
        )}

        <SubmitButton busy={pending} label={register ? "Create account" : "Log in"} busyLabel={register ? "Creating account…" : "Signing in…"} />
      </form>

      <div className="mt-3">
        <GoogleSignInButton text={register ? "signup_with" : "continue_with"} dividerText="or" onSignedIn={signedIn} />
      </div>

      <p className="mt-3.5 text-center text-xs text-ink-soft">
        {register ? "Already have an account?" : "New to Top College Path?"}{" "}
        <button type="button" onClick={() => switchTo(register ? "login" : "register")} className="font-semibold text-ink underline underline-offset-4 hover:text-brand">
          {register ? "Log in" : "Create an account"}
        </button>
      </p>
    </BrandedShell>
  );
}

/* ------------------------------------------------------------------ *
   Ask a question / a counsellor
 * ------------------------------------------------------------------ */

export function QueryModal({ kind, slug, collegeName, user, onClose }: { kind: "query" | "counsellor"; slug: string; collegeName: string; user: SessionUser; onClose: () => void }) {
  const [type, setType] = useState<"query" | "concern">("query");
  const [message, setMessage] = useState(kind === "counsellor" ? `I would like to know more about admission at ${collegeName}.` : "");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (kind === "counsellor" && !user.phone) {
      const problem = phoneProblem(phone, true);
      setPhoneError(problem ?? undefined);
      if (problem) return;
    }
    if (kind === "query" && message.trim().length < 10) return setError("Write a little more, at least 10 characters.");
    start(async () => {
      const result = await submitCollegeQuery(slug, {
        kind: kind === "counsellor" ? "counsellor" : type,
        message,
        phone: user.phone ? undefined : phone,
        sourceUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      if (result.ok) setDone(result.message);
      else setError(result.message);
    });
  };

  const title = kind === "counsellor" ? "Talk to a counsellor" : "Ask a question";
  return (
    <Shell title={title} subtitle={collegeName} onClose={onClose}>
      {done ? (
        <Done message={done} onClose={onClose} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-bg-alt px-3 py-2 text-xs text-ink-soft">Sending as <strong className="text-ink">{user.name}</strong> · {user.email}</p>
          {kind === "query" && (
            <Field id="q-type" label="What is it about?">
              <select id="q-type" value={type} onChange={(e) => setType(e.target.value as "query" | "concern")} className={fieldClass()}>
                <option value="query">A question</option>
                <option value="concern">A concern</option>
              </select>
            </Field>
          )}
          <Field id="q-message" label={kind === "counsellor" ? "Anything you would like us to know (optional)" : type === "concern" ? "Tell us your concern" : "Your question"}>
            <textarea id="q-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={900} placeholder={kind === "counsellor" ? "" : "Write it here, in a few lines."} className={fieldClass()} />
          </Field>
          {kind === "counsellor" && !user.phone && (
            <Field id="q-phone" label="Mobile number" error={phoneError} hint="Your account has no number yet. A counsellor needs one to reach you.">
              <input
                id="q-phone"
                type="tel"
                inputMode="tel"
                maxLength={18}
                value={phone}
                onChange={(e) => { setPhone(mobileDigits(e.target.value)); setPhoneError(undefined); }}
                onBlur={() => setPhoneError(phoneProblem(phone, true) ?? undefined)}
                placeholder="10-digit mobile number"
                aria-invalid={!!phoneError}
                className={fieldClass(phoneError)}
              />
            </Field>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}
          <SubmitButton busy={pending} label={kind === "counsellor" ? "Request a call" : "Send"} busyLabel="Sending…" />
        </form>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
   Write a review
 * ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: "ratingPlacements", label: "Placements" },
  { key: "ratingFaculty", label: "Faculty" },
  { key: "ratingInfrastructure", label: "Infrastructure" },
  { key: "ratingCampusLife", label: "Campus life" },
] as const;

type Ratings = Record<(typeof CATEGORIES)[number]["key"], number>;
const REVIEW_MIN = 20;
const BATCH = /^\d{4}(?:\s*[-–—]\s*(?:\d{4}|\d{2}))?$/;

function StarPicker({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 5`} onClick={() => onChange(n)} className="rounded p-0.5 transition hover:scale-110">
          <Star className={`h-6 w-6 ${n <= value ? "fill-gold text-gold" : "text-line"}`} />
        </button>
      ))}
    </span>
  );
}

export function ReviewModal({ slug, collegeName, courses, user, onClose }: { slug: string; collegeName: string; courses: string[]; user: SessionUser; onClose: () => void }) {
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [ratings, setRatings] = useState<Ratings>({ ratingPlacements: 0, ratingFaculty: 0, ratingInfrastructure: 0, ratingCampusLife: 0 });
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!course.trim()) found.course = "Tell us which course you studied.";
    const years = batch.match(/\d{4}/g)?.map(Number) ?? [];
    const thisYear = new Date().getFullYear();
    if (!BATCH.test(batch.trim())) found.batch = "Enter the batch as a year or a range, such as 2002-2006.";
    else if (years.some((y) => y < 1950 || y > thisYear + 1)) found.batch = `Use years between 1950 and ${thisYear + 1}.`;
    else if (years.length === 2 && years[1] < years[0]) found.batch = "The end year comes after the start year.";
    if (CATEGORIES.some((c) => ratings[c.key] === 0)) found.ratings = "Give every area a rating.";
    if (body.trim().length < REVIEW_MIN) found.body = `Write at least ${REVIEW_MIN} characters.`;
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const result = await submitReview(slug, { course: course.trim(), batch: batch.trim(), body: body.trim(), ...ratings });
      if (result.ok) setDone(result.message);
      else setError(result.message);
    });
  };

  return (
    <Shell title="Write a review" subtitle={collegeName} onClose={onClose}>
      {done ? (
        <Done message="Thank you for your review!" note={done} onClose={onClose} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="rounded-lg bg-bg-alt px-3 py-2 text-xs text-ink-soft">Posting as <strong className="text-ink">{user.name}</strong>. Our team reads every review before it goes live.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="rv-course" label="Course or programme" error={errors.course}>
              <input id="rv-course" list="rv-courses" maxLength={100} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. MBA" className={fieldClass(errors.course)} />
              <datalist id="rv-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field id="rv-batch" label="Batch" error={errors.batch} hint="The years you studied, such as 2002-2006.">
              <input id="rv-batch" maxLength={9} inputMode="numeric" value={batch} onChange={(e) => setBatch(e.target.value.replace(/[^\d\s-]/g, ""))} placeholder="2002-2006" className={fieldClass(errors.batch)} />
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold text-ink">Rate your experience</p>
            <ul className="mt-2 divide-y divide-line-soft rounded-xl border border-line">
              {CATEGORIES.map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-ink">{c.label}</span>
                  <StarPicker label={c.label} value={ratings[c.key]} onChange={(n) => setRatings((r) => ({ ...r, [c.key]: n }))} />
                </li>
              ))}
            </ul>
            {errors.ratings && <p className="mt-1 text-xs text-red-700">{errors.ratings}</p>}
          </div>

          <Field id="rv-body" label="Your review" error={errors.body} hint={`${body.trim().length} characters. At least ${REVIEW_MIN}.`}>
            <textarea id="rv-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="What was it like to study here?" className={fieldClass(errors.body)} />
          </Field>

          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}
          <SubmitButton busy={pending} label="Submit review" busyLabel="Submitting…" />
        </form>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
   One more step: where you are and what you are looking for
 * ------------------------------------------------------------------ */

/** True when the account lacks what a counsellor needs: where the student is and the stream they want. */
export function profileIncomplete(user: SessionUser): boolean {
  return !user.state || !user.city || !user.preferredStream;
}

/**
 * Shown after sign-up (or on the first action of an account that has none of it): state, city, stream and,
 * if they like, the exam they are preparing for. These are the same details as the profile page, so what is
 * saved here is what they will see there. Nothing else on the page can be done until it is filled in.
 */
export function ProfileModal({ user, onDone, onClose }: { user: SessionUser; onDone: () => void; onClose: () => void }) {
  const [choices, setChoices] = useState<ProfileChoices | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getProfileChoices().then((found) => alive && setChoices(found));
    return () => {
      alive = false;
    };
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const str = (key: string) => String(form.get(key) ?? "").trim();
    const found: Record<string, string> = {};
    if (!str("state")) found.state = "Choose your state.";
    if (!str("city")) found.city = "Choose your city or district.";
    else if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’()-]*$/u.test(str("city"))) found.city = "Use letters only in the city.";
    if (!str("stream")) found.stream = "Choose a stream.";
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;
    start(async () => {
      const result = await saveProfileDetails({ state: str("state"), city: str("city"), stream: str("stream"), exam: str("exam") });
      if (result.ok) onDone();
      else setError(result.message);
    });
  };

  const withSaved = (options: { slug: string; name: string }[], saved: string | null) =>
    saved && !options.some((o) => o.slug === saved) ? [...options, { slug: saved, name: saved }] : options;

  return (
    <BrandedShell title="One more step" subtitle="Tell us where you are and what you are looking for, so a counsellor can help." wide onClose={onClose}>
      {!choices ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-2.5">
          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
          <div className="grid gap-2.5 sm:grid-cols-2 [&_label]:text-xs [&_select]:mt-0.5 [&_select]:bg-white [&_input[aria-label]]:mt-1.5">
            <StateCityFields geo={choices.geo} defaultState={user.state ?? ""} defaultCity={user.city ?? ""} required />
          </div>
          {(errors.state || errors.city) && <p className="text-xs text-red-700">{errors.state ?? errors.city}</p>}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field id="pf-stream" label="Stream you are interested in" error={errors.stream}>
              <select id="pf-stream" name="stream" defaultValue={user.preferredStream ?? ""} aria-invalid={!!errors.stream} className={compactField(errors.stream)}>
                <option value="">Select a stream</option>
                {withSaved(choices.streams, user.preferredStream).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </Field>
            <Field id="pf-exam" label="Exam you are preparing for (optional)">
              <select id="pf-exam" name="exam" defaultValue={user.targetExam ?? ""} className={compactField()}>
                <option value="">Select an exam</option>
                {withSaved(choices.exams, user.targetExam).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
              </select>
            </Field>
          </div>

          <SubmitButton busy={pending} label="Save and continue" busyLabel="Saving…" />
          <p className="text-center text-[11px] text-ink-faint">You can change these any time on your account page.</p>
        </form>
      )}
    </BrandedShell>
  );
}

/* ------------------------------------------------------------------ *
   Callback, application and brochure
 * ------------------------------------------------------------------ */

const BEST_TIMES = ["Any time", "Morning (9 am to 12 pm)", "Afternoon (12 to 4 pm)", "Evening (4 to 8 pm)"];

const LEAD_COPY = {
  callback: { title: "Get a free callback", send: "Request a callback", busy: "Sending…" },
  apply: { title: "Apply", send: "Send my application", busy: "Sending…" },
  brochure: { title: "Download the brochure", send: "Send and download", busy: "Sending…" },
} as const;

/**
 * The form behind the callback, Apply and Brochure buttons. Only a signed-in student reaches it; their name,
 * email and number come from the account, so they pick the programme (for an application), say anything useful,
 * and send. The team gets it as a lead and the student finds it under Enquiries on their account. For the
 * brochure, the download starts as soon as it is sent.
 */
export function LeadModal({
  kind,
  slug,
  collegeName,
  programmes,
  brochureUrl,
  programme: initialProgramme,
  topic,
  user,
  onClose,
}: {
  kind: "callback" | "apply" | "brochure";
  /** The college it is about; empty on a page that is not a college's. */
  slug: string;
  collegeName: string;
  programmes: string[];
  brochureUrl: string;
  programme?: string;
  topic?: string;
  user: SessionUser;
  onClose: () => void;
}) {
  const [programme, setProgramme] = useState(initialProgramme ?? (kind === "apply" ? (programmes[0] ?? "") : ""));
  const [bestTime, setBestTime] = useState(BEST_TIMES[0]);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const copy = LEAD_COPY[kind];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user.phone) {
      const problem = phoneProblem(phone, true);
      setPhoneError(problem ?? undefined);
      if (problem) return;
    }
    start(async () => {
      const result = await submitCollegeLead(slug, {
        kind,
        programme: programme || undefined,
        // Off a college's pages the page's own title says what it was about.
        topic: slug ? undefined : topic ?? (typeof document !== "undefined" ? document.title.replace(/\s*[—|-]\s*TopCollegePath.*$/i, "") : undefined),
        bestTime: kind === "callback" ? bestTime : undefined,
        message,
        phone: user.phone ? undefined : phone,
        sourceUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      if (!result.ok) return setError(result.message);
      setDone(result.message);
      // The brochure opens as soon as it is requested. A browser may block it; the button below is the fallback.
      if (kind === "brochure" && brochureUrl) window.open(brochureUrl, "_blank", "noopener");
    });
  };

  return (
    <Shell title={kind === "apply" ? (collegeName ? `Apply to ${collegeName}` : "Apply") : copy.title} subtitle={kind === "apply" ? "Choose the programme you are interested in." : collegeName || undefined} onClose={onClose}>
      {done ? (
        <Done
          message={done}
          note={kind === "brochure" && !brochureUrl ? "This college has not uploaded its brochure yet, so a counsellor will send it to you." : undefined}
          onClose={onClose}
          action={
            kind === "brochure" && brochureUrl ? (
              <a href={brochureUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">
                <Download className="h-4 w-4" /> Download the brochure
              </a>
            ) : undefined
          }
        />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-bg-alt px-3 py-2 text-xs text-ink-soft">Sending as <strong className="text-ink">{user.name}</strong> · {user.email}</p>

          {(kind === "apply" || programmes.length > 0) && (
            <Field id="ld-programme" label={kind === "apply" ? "Programme" : "Interested in (optional)"}>
              <select id="ld-programme" value={programme} onChange={(e) => setProgramme(e.target.value)} className={fieldClass()}>
                {kind !== "apply" && <option value="">Not sure yet</option>}
                {programmes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          )}

          {kind === "callback" && (
            <Field id="ld-time" label="Best time to call">
              <select id="ld-time" value={bestTime} onChange={(e) => setBestTime(e.target.value)} className={fieldClass()}>
                {BEST_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          )}

          {kind !== "brochure" && (
            <Field id="ld-message" label="Anything you would like us to know (optional)">
              <textarea id="ld-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={600} className={fieldClass()} />
            </Field>
          )}

          {!user.phone && (
            <Field id="ld-phone" label="Mobile number" error={phoneError} hint="Your account has no number yet. A counsellor needs one to reach you.">
              <input
                id="ld-phone"
                type="tel"
                inputMode="tel"
                maxLength={18}
                value={phone}
                onChange={(e) => { setPhone(mobileDigits(e.target.value)); setPhoneError(undefined); }}
                onBlur={() => setPhoneError(phoneProblem(phone, true) ?? undefined)}
                placeholder="10-digit mobile number"
                aria-invalid={!!phoneError}
                className={fieldClass(phoneError)}
              />
            </Field>
          )}

          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}
          <SubmitButton busy={pending} label={copy.send} busyLabel={copy.busy} />
        </form>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ *
   Admin accounts
 * ------------------------------------------------------------------ */

/** Shown when someone signed in as an admin tries a student action. Those are for student accounts. */
export function AdminNoticeModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell title="This is for student accounts" onClose={onClose}>
      <p className="text-sm leading-relaxed text-ink-soft">
        You are signed in as an admin. Writing reviews, asking questions, applying, requesting a callback or a brochure, and liking answers are for student accounts. Use a student account to try them, or carry on in the admin panel.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin" className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark">Open the admin panel</Link>
        <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Close</button>
      </div>
    </Shell>
  );
}
