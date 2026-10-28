"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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

export function LoginForm({ next, idle = false, copy }: { next?: string; idle?: boolean; copy: AuthPageCopy }) {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div>
      <h1 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">{copy.heading}</h1>
      {copy.subheading && <p className="mt-1.5 text-center text-sm text-ink-soft">{copy.subheading}</p>}

      {idle && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-bg-alt px-3 py-2 text-sm text-ink-soft">
          You were signed out because you were inactive. Log in again to continue.
        </p>
      )}

      <form className="mt-5 space-y-3.5" action={formAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-ink">
            {copy.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={copy.emailPlaceholder}
            className={PILL}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-ink">
            {copy.passwordLabel}
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            className={PILL}
          />
        </div>

        {copy.rememberLabel && (
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-line text-brand focus:ring-brand" />
            {copy.rememberLabel}
          </label>
        )}

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
