"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";

/**
 * Password reset request.
 *
 * The login screen has linked here since it was written; the route did not
 * exist, so "Forgot password?" was a 404.
 *
 * The confirmation says "if that email is registered" rather than "we've sent
 * you a link", and it is shown for any valid address. That is the same reason
 * the endpoint answers identically in both cases: a page that confirms an
 * account exists lets anyone enumerate the user base one address at a time.
 */
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const successRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFormError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter the email address on your account.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.errors?.email) {
          setError(payload.errors.email);
          setStatus("idle");
          return;
        }
        throw new Error("Request failed");
      }

      setStatus("done");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (requestError) {
      console.error("Password reset request failed", requestError);
      setFormError("We could not send that just now. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="rounded-2xl border border-line bg-surface p-6 shadow-sm focus:outline-none sm:p-8"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="h-5 w-5" />
        </span>

        <h1 className="mt-4 font-display text-xl font-bold text-ink">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          If <span className="font-medium text-ink">{email.trim()}</span> is registered with us, a
          link to set a new password is on its way. It expires in an hour.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Nothing arrived? Check the spam folder, or{" "}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="font-semibold text-brand hover:underline"
          >
            try a different address
          </button>
          .
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <p className="mt-5 text-[11px] text-ink-faint">
          No email is sent in this build — password resets go live with the admin module.
        </p>
      </div>
    );
  }

  const busy = status === "submitting";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-xl font-bold text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Enter the email on your account and we will send a link to set a new password.
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

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-xs font-semibold text-ink">
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!error}
            aria-describedby={error ? "reset-email-error" : undefined}
            className={`mt-1.5 w-full rounded-lg border bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              error ? "border-red-500 focus:border-red-500" : "border-line focus:border-brand"
            }`}
          />
          {error && (
            <p id="reset-email-error" className="mt-1 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
