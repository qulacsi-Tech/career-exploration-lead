"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "password" | "confirm" | "terms", string>
>;

const BASE_FIELD =
  "mt-1.5 w-full rounded-lg border bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none";

function fieldClass(invalid?: string, extra = "") {
  return `${BASE_FIELD} ${
    invalid ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"
  } ${extra}`;
}

/**
 * How strong the password looks, for the meter under the field.
 *
 * Deliberately crude — length and character variety, no dictionary check. It is
 * guidance while typing, not the gate: `passwordProblem` on the server is what
 * actually decides, and a meter that blocks submission frustrates people using
 * a perfectly good passphrase from a manager.
 */
function strength(password: string) {
  if (!password) return { score: 0, label: "", tone: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak", tone: "bg-red-500 text-red-700" };
  if (score === 3) return { score, label: "Fair", tone: "bg-amber-500 text-amber-700" };
  if (score === 4) return { score, label: "Good", tone: "bg-lime-600 text-lime-700" };
  return { score, label: "Strong", tone: "bg-green-600 text-green-700" };
}

/**
 * Student sign-up form.
 *
 * The header has advertised "Login / Register" from the start and the login
 * screen links here, but the route did not exist — both went to a 404.
 *
 * Validation mirrors the `signUp` action, for the same reason the enquiry form
 * does: the message beside the input needs to be local, and the server cannot
 * trust the client. Values survive a failed submit; focus moves to the first
 * problem, and to the confirmation once it succeeds.
 */
export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, busy] = useActionState(signUp, undefined);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);

  const meter = strength(password);
  // What the server rejected shows until the visitor submits again; what the
  // browser caught shows first, so a typo never costs a round trip.
  const errors: FieldErrors = { ...(state?.errors as FieldErrors | undefined), ...clientErrors };
  const formError = state?.error ?? null;

  const validate = (data: Record<string, FormDataEntryValue | null>): FieldErrors => {
    const next: FieldErrors = {};
    const str = (key: string) => String(data[key] ?? "").trim();

    if (str("name").length < 2) next.name = "Enter your full name.";

    const email = str("email");
    if (!email) next.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      next.email = "That does not look like a valid email.";

    const phone = str("phone").replace(/[\s-()]/g, "");
    if (phone && !/^(?:\+?91)?[6-9]\d{9}$|^\+?\d{8,15}$/.test(phone))
      next.phone = "That does not look like a valid number.";

    const pass = String(data.password ?? "");
    if (!pass) next.password = "Choose a password.";
    else if (pass.length < 8) next.password = "Use at least 8 characters.";
    else if (!/[a-zA-Z]/.test(pass) || !/\d/.test(pass))
      next.password = "Include at least one letter and one number.";

    if (String(data.confirm ?? "") !== pass) next.confirm = "Both passwords must match.";
    if (data.terms == null) next.terms = "Accept the terms to create an account.";

    return next;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const found = validate(Object.fromEntries(new FormData(form).entries()));
    setClientErrors(found);

    if (Object.keys(found).length > 0) {
      // Stop the action; the browser's own checks have already told the visitor what to fix.
      event.preventDefault();
      form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-xl font-bold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Shortlist colleges, save comparisons and pick up where you left off.
      </p>

      {formError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form action={formAction} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="reg-name" className="block text-xs font-semibold text-ink">
            Full name
          </label>
          <input
            id="reg-name"
            name="name"
            autoComplete="name"
            placeholder="Priya Sharma"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "reg-name-error" : undefined}
            className={fieldClass(errors.name)}
          />
          {errors.name && (
            <p id="reg-name-error" className="mt-1 text-xs text-red-700">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-ink">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "reg-email-error" : undefined}
            className={fieldClass(errors.email)}
          />
          {errors.email && (
            <p id="reg-email-error" className="mt-1 text-xs text-red-700">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-phone" className="block text-xs font-semibold text-ink">
            Mobile number <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "reg-phone-error" : undefined}
            className={fieldClass(errors.phone)}
          />
          {errors.phone && (
            <p id="reg-phone-error" className="mt-1 text-xs text-red-700">
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={revealed ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={`reg-password-hint${errors.password ? " reg-password-error" : ""}`}
              className={fieldClass(errors.password, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-ink-faint transition hover:text-brand"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-1 flex-1 gap-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <span
                    key={step}
                    className={`h-1 flex-1 rounded-full ${
                      step <= meter.score ? meter.tone.split(" ")[0] : "bg-line"
                    }`}
                  />
                ))}
              </span>
              <span className={`text-[11px] font-semibold ${meter.tone.split(" ")[1] ?? ""}`}>
                {meter.label}
              </span>
            </div>
          )}

          <p id="reg-password-hint" className="mt-1.5 text-[11px] text-ink-faint">
            At least 8 characters, including a letter and a number.
          </p>
          {errors.password && (
            <p id="reg-password-error" className="mt-1 text-xs text-red-700">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-confirm" className="block text-xs font-semibold text-ink">
            Confirm password
          </label>
          <input
            id="reg-confirm"
            name="confirm"
            type={revealed ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "reg-confirm-error" : undefined}
            className={fieldClass(errors.confirm)}
          />
          {errors.confirm && (
            <p id="reg-confirm-error" className="mt-1 text-xs text-red-700">
              {errors.confirm}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              name="terms"
              aria-invalid={!!errors.terms}
              aria-describedby={errors.terms ? "reg-terms-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-brand hover:underline">
                terms of use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-brand hover:underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errors.terms && (
            <p id="reg-terms-error" className="mt-1 text-xs text-red-700">
              {errors.terms}
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            name="marketing"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand"
          />
          <span>Send me admission updates, exam alerts and counselling offers (optional).</span>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="mt-5">
        <GoogleSignInButton next={next} text="signup_with" />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
