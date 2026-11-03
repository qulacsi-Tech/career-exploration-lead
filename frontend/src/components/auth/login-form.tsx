"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { RegisterForm } from "@/components/auth/register-form";
import { identifierProblem } from "@/lib/field-rules";
import { PasswordInput } from "@/components/ui/password-input";
import type { AuthPageCopy } from "@/lib/api";

/**
 * Login form.
 *
 * Posts to the signIn Server Action. The action checks the account against the
 * API, stores the session in an httpOnly cookie, and redirects: admins to /admin,
 * students to where they were going (`next`) or their account page.
 * A form action rather than a client-side fetch keeps the password out of the
 * URL and out of browser-readable storage; a GET form would put it in history
 * and server logs.
 *
 * The words come from `copy` (Listings & Pages > Login & Signup in the admin); the fields and what they
 * do are fixed.
 */
const PILL = "mt-1 w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export function LoginForm({ next, copy, signupCopy }: { next?: string; copy: AuthPageCopy; /** The sign up page's words, for when no account is found and the form grows into sign up. */ signupCopy?: AuthPageCopy }) {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const [typedError, setTypedError] = useState<string | null>(null);

  // No account has what was typed: the form becomes sign up, with it already filled in.
  if (state?.notFound && signupCopy && state.identifier) {
    const typed = state.identifier;
    return (
      <RegisterForm
        next={next}
        copy={signupCopy}
        prefill={typed.includes("@") ? { email: typed } : { phone: typed }}
        notice={`We could not find an account for ${typed}. Create one below. It takes a minute.`}
      />
    );
  }

  // The email field takes an email address or a mobile number.
  const idLabel = /mobile|phone/i.test(copy.emailLabel) ? copy.emailLabel : `${copy.emailLabel} or mobile number`;

  return (
    <div>
      <h1 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">{copy.heading}</h1>
      {copy.subheading && <p className="mt-1.5 text-center text-sm text-ink-soft">{copy.subheading}</p>}

      <form
        className="mt-5 space-y-3.5"
        action={formAction}
        noValidate
        onSubmit={(e) => {
          const problem = identifierProblem(String(new FormData(e.currentTarget).get("email") ?? ""));
          setTypedError(problem);
          if (problem) e.preventDefault();
        }}
      >
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-ink">
            {idLabel}
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            maxLength={254}
            placeholder={`${copy.emailPlaceholder} or 9876543210`}
            aria-invalid={!!typedError}
            className={PILL}
            onChange={() => typedError && setTypedError(null)}
          />
          {typedError && <p className="mt-1 text-xs text-red-700">{typedError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-ink">
              {copy.passwordLabel}
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            className={PILL}
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Logging in…" : copy.submitLabel}
        </button>
      </form>

      <div className="mt-4">
        <GoogleSignInButton next={next} text="continue_with" dividerText={copy.dividerText} />
      </div>

      {(copy.switchText || copy.switchLink) && (
        <p className="mt-5 text-center text-sm text-ink-soft">
          {copy.switchText}{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-ink underline underline-offset-4 hover:text-brand">
            {copy.switchLink}
          </Link>
        </p>
      )}
    </div>
  );
}
